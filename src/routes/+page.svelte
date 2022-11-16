<p>Welcome to <b>unshared</b></p>

<input class="project" name="project" type="file" accept=".sb3" bind:this={fileInput}>

<button class="upload" on:click={upload}>Upload</button>

{#if uploadedProject}
  <p><a href={`projects/${uploadedProject.projectId}`}>Link</a></p>
  <p>Ownership token: {uploadedProject.ownershipToken}</p>
  <p>Expires: {uploadedProject.expires}</p>
{/if}

<script lang="ts">
  import { storeLocalProjectData } from '$lib/local-project-data';

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

    const createIncompleteProject = async () => {
      const projectJSONFile = zip.file('project.json');
      if (!projectJSONFile) {
        throw new Error('No project.json');
      }
      const projectJSONData = await projectJSONFile.async('blob');
      const body = new FormData();
      body.append('project', projectJSONData);
      return (await fetch('/api/projects/new', {
        method: 'POST',
        body
      })).json();
    };

    const incompleteProject = await createIncompleteProject();
    const projectId = incompleteProject.id;
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
      return fetch(`/api/projects/${projectId}/assets/${assetId}/upload`, {
        method: 'POST',
        body
      });
    };

    await Promise.all(incompleteProject.missingAssets.map(uploadAsset));

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
