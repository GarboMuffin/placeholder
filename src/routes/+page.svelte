<style>

</style>

<!-- <p>Welcome to <b>unshared</b></p> -->

<input class="project" name="project" type="file" accept=".sb3" bind:this={fileInput}>

<button class="upload" on:click={upload}>Upload</button>

{#if uploadedProject}
  <p><a href={`projects/${uploadedProject.projectId}`}>Link</a></p>
  <p>Ownership token: {uploadedProject.ownershipToken}</p>
  <p>Expires: {uploadedProject.expires}</p>
{/if}

<script lang="ts">
  import { storeLocalProjectData } from '$lib/local-project-data';
  import { parseProject } from '$lib/parse';
  import type { IncompleteProject } from '$lib/server/db';

  let fileInput: HTMLInputElement;

  interface UploadedProject {
    projectId: string;
    expires: number;
    ownershipToken: string;
  }
  let uploadedProject: UploadedProject | null = null;

  const uploadFile = async (file: File): Promise<UploadedProject> => {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);

    const projectJSONFile = zip.file('project.json');
    if (!projectJSONFile) {
      throw new Error('No project.json');
    }
    const projectJSONData = await projectJSONFile.async('blob');
    const parsedProject = parseProject(await projectJSONData.text());

    const md5extsToSha256: Record<string, string> = {};
    for (const md5ext of parsedProject.md5exts) {
      const data = await zip.file(md5ext)!.async('arraybuffer');
      const sha256Buffer = await crypto.subtle.digest('SHA-256', data);
      const sha256Array = Array.from(new Uint8Array(sha256Buffer));
      const sha256 = sha256Array.map((b) => b.toString(16).padStart(2, '0')).join('');
      md5extsToSha256[md5ext] = sha256;
    }

    const newProjectBody = new FormData();
    newProjectBody.append('project', projectJSONData);
    newProjectBody.append('md5exts', JSON.stringify(md5extsToSha256));
    const incompleteProject: IncompleteProject = await (await fetch('/api/projects/new', {
      method: 'POST',
      body: newProjectBody
    })).json();

    const projectId = incompleteProject.projectId;
    const ownershipToken = incompleteProject.ownershipToken;
    const expires = incompleteProject.expires;

    const uploadAsset = async (assetId: string) => {
      const assetFile = zip.file(assetId);
      if (!assetFile) {
        throw new Error(`Missing asset file: ${assetId}`);
      }
      const assetData = await assetFile.async('blob');
      const body = new FormData();
      body.append('asset', assetData);
      body.set('ownershipToken', ownershipToken);
      return fetch(`/api/projects/${projectId}/assets/${assetId}`, {
        method: 'POST',
        body
      });
    };

    await Promise.all(incompleteProject.missingMd5exts.map(uploadAsset));

    const completeProject = async () => {
      await fetch(`/api/projects/${projectId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ownershipToken
        })
      })
    };

    await completeProject();

    return {
      projectId,
      ownershipToken,
      expires
    };
  };

  const upload = async () => {
    const file = fileInput.files![0];
    if (!file) {
      alert('No file selected');
      return;
    }

    uploadedProject = null;
    try {
      uploadedProject = await uploadFile(file);
      storeLocalProjectData(
        uploadedProject.projectId,
        uploadedProject.ownershipToken,
        uploadedProject.expires
      );
    } catch (e) {
      console.error(e);
      alert(e);
    }
  };
</script>
