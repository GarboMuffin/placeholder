<svelte:window
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
/>

<style>
  .outer {
    position: relative;
    margin: 16px 0;
    padding: 16px 0;
    width: 100%;
    height: 100px;
    box-sizing: border-box;
    color: #555;
    border: 5px dashed currentColor;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
  }
  @media (prefers-color-scheme: dark) {
    .outer {
      color: #aaa;
    }
  }
  .dropping {
    color: #55a;
  }
  .outer:focus-within {
    outline: 2px solid #55a;
  }
  .label {
    font-size: 1.25em;
    margin-bottom: 8px;
  }

  input[type="file"] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .uploaded-project {
    color: black;
    margin: 16px 0;
    padding: 8px;
    background: rgb(113, 255, 113);
    border: 1px solid rgb(46, 216, 46);
    border-radius: 10px;
  }
  .uploaded-project a {
    color: blue;
  }
</style>

<label class="outer" class:dropping={isDropping}>
  <!-- use hidden instead of a svelte {#if} because we don't want the input element -->
  <!-- to be removed. That might break our File objects. -->
  <input
    type="file"
    accept=".sb3"
    autocomplete="off"
    bind:this={fileInput}
    on:change={fileInputChanged}
    hidden={isUploading}
  >

  {#if isUploading}
    <div>
      <div>{progressText}</div>
      <progress value={progress} />
    </div>
  {:else}
    <div class="label">Select or drop a .sb3 file</div>
  {/if}
</label>

{#if uploadedProject}
  <div class="uploaded-project">
    <p>Success! Your project was uploaded. Here is your link:</p>
    <p><a data-sveltekit-reload href={projectURL}>{projectURL}</a></p>
    <p><b>During the early prototype period, all projects will be deleted randomly.</b></p>
    <p>Only you will be able to edit the project's information (we've stored a secret token in your browser to prove ownership).</p>
  </div>
{/if}

<script lang="ts">
  import { parseProject } from '$lib/parse';
  import type { IncompleteProject } from "./server/db";
  import { storeLocalProjectData } from "./local-project-data";

  interface UploadedProject {
    projectId: string;
    expires: number;
    ownershipToken: string;
  }

  let fileInput: HTMLInputElement;
  let isUploading = false;
  let uploadedProject: UploadedProject | null = null;
  $: projectURL = uploadedProject ? (
    new URL(`projects/${uploadedProject.projectId}`, location.href).href
  ) : null

  let progressText = '';
  let progress: number = 0;

  const uploadProject = async (file: File) => {
    const title = file.name.replace(/\.sb3$/, '');

    progress = 0;
    progressText = 'Loading JSZip';
    const JSZip = (await import('jszip')).default;

    progress = 0.05;
    progressText = 'Extracting project';
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

    progress = 0.1;
    progressText = 'Uploading project data';
    const newProjectBody = new FormData();
    newProjectBody.append('project', projectJSONData);
    newProjectBody.append('md5exts', JSON.stringify(md5extsToSha256));
    newProjectBody.append('title', title);
    const incompleteProject: IncompleteProject = await (await fetch('/api/projects/new', {
      method: 'POST',
      body: newProjectBody
    })).json();

    const projectId = incompleteProject.projectId;
    const ownershipToken = incompleteProject.ownershipToken;
    const expires = incompleteProject.expires;
    const missingMd5exts = incompleteProject.missingMd5exts;

    progressText = 'Uploading assets';
    progress = 0.2;
    const totalAssetsToUpload = missingMd5exts.length;
    let uploadedAssets = 0;

    const uploadAsset = async (assetId: string) => {
      const assetFile = zip.file(assetId);
      if (!assetFile) {
        throw new Error(`Missing asset file: ${assetId}`);
      }
      const assetData = await assetFile.async('blob');
      const body = new FormData();
      body.append('asset', assetData);
      body.set('ownershipToken', ownershipToken);
      const res = await fetch(`/api/projects/${projectId}/assets/${assetId}`, {
        method: 'POST',
        body
      });
      await res.json();
      uploadedAssets++;
      progress = 0.2 + (uploadedAssets / totalAssetsToUpload) * 0.8;
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

    progress = 1;
    progressText = 'Finalizing';
    await completeProject();

    return {
      projectId,
      ownershipToken,
      expires
    };
  };

  const fileInputChanged = async () => {
    // Not null because input is of type="file"
    const file = fileInput.files![0];
    if (!file) {
      return;
    }

    try {
      isUploading = true;
      uploadedProject = null;
      uploadedProject = await uploadProject(file);
      storeLocalProjectData(
        uploadedProject.projectId,
        uploadedProject.ownershipToken,
        uploadedProject.expires
      );
    } catch (e) {
      console.error(e);
      alert(e);
    }

    isUploading = false;
  };

  let isDropping = false;
  const hasFile = (transfer: DataTransfer | null): transfer is DataTransfer => {
    return !!transfer && transfer.types.includes('Files');
  };
  const handleDragOver = (e: DragEvent) => {
    if (hasFile(e.dataTransfer)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      isDropping = true;
    }
  };
  const handleDragLeave = (e: DragEvent) => {
    isDropping = false;
  };
  const handleDrop = (e: DragEvent) => {
    isDropping = false;
    if (hasFile(e.dataTransfer)) {
      e.preventDefault();
      fileInput.files = e.dataTransfer.files;
      fileInputChanged();
    }
  };
</script>
