<script lang="ts">
  import { parseProject } from '$lib/parse';
  import type { IncompleteProject, AssetInformation } from "./server/db";
  import { storeLocalProjectData } from "./local-project-data";
  import { fetchWithErrorHandling } from './fetch';

  interface UploadedProject {
    projectId: string;
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
    progressText = 'Loading libraries';
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

    const assetInformation: AssetInformation = {};
    const processMd5ext = async (md5ext: string) => {
      const assetFile = zip.file(md5ext);
      if (!assetFile) {
        throw new Error(`Missing asset: ${md5ext}`);
      }
      const data = await assetFile.async('arraybuffer');
      const sha256Buffer = await crypto.subtle.digest('SHA-256', data);
      const sha256Array = Array.from(new Uint8Array(sha256Buffer));
      const sha256 = sha256Array.map((b) => b.toString(16).padStart(2, '0')).join('');
      const size = data.byteLength;
      assetInformation[md5ext] = {
        sha256,
        size
      };
    };
    await Promise.all(parsedProject.md5exts.map(processMd5ext));

    progress = 0.1;
    progressText = 'Uploading project data';

    const createNewProject = async (): Promise<IncompleteProject> => {
      const body = new FormData();
      body.append('project', projectJSONData);
      body.append('assetInformation', JSON.stringify(assetInformation));
      body.append('title', title);
      return await (await fetchWithErrorHandling('/api/projects/new', {
        method: 'POST',
        body: body
      })).json();
    };
    const incompleteProject = await createNewProject();

    const projectId = incompleteProject.projectId;
    const ownershipToken = incompleteProject.ownershipToken;
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
      const res = await fetchWithErrorHandling(`/api/projects/${projectId}/assets/${assetId}`, {
        method: 'POST',
        body
      });
      await res.json();
      uploadedAssets++;
      progress = 0.2 + (uploadedAssets / totalAssetsToUpload) * 0.8;
    };
    await Promise.all(incompleteProject.missingMd5exts.map(uploadAsset));

    progress = 1;
    progressText = 'Finalizing';
    const completeProject = async () => {
      const body = new FormData();
      body.set('ownershipToken', ownershipToken);
      await fetchWithErrorHandling(`/api/projects/${projectId}/complete`, {
        method: 'POST',
        body
      });
    };
    await completeProject();

    return {
      projectId,
      ownershipToken
    };
  };

  const fileInputChanged = async () => {
    // Not null because input is of type="file"
    const file = fileInput.files![0];
    if (!file) {
      return;
    }

    if (isUploading) {
      return;
    }

    try {
      isUploading = true;
      uploadedProject = null;
      uploadedProject = await uploadProject(file);
      storeLocalProjectData(
        uploadedProject.projectId,
        uploadedProject.ownershipToken
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

<svelte:window
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
/>

<style>
  .outer {
    position: relative;
    padding: 1em 0;
    width: 100%;
    height: 100px;
    box-sizing: border-box;
    color: #555;
    border: 0.25em dashed currentColor;
    border-radius: 0.5em;
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
  .uploading {
    cursor: auto;
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
    margin: 1em 0;
    padding: 0.5em;
    background: rgb(113, 255, 113);
    border: 1px solid rgb(46, 216, 46);
    border-radius: 0.5em;
  }

  a {
    color: blue;
  }
  a:active {
    color: red;
  }
</style>

<label class="outer" class:dropping={isDropping} class:uploading={isUploading}>
  <input
    type="file"
    accept=".sb3"
    autocomplete="off"
    bind:this={fileInput}
    on:change={fileInputChanged}
    disabled={isUploading}
    hidden={isUploading}
  >

  {#if isUploading}
    <div>
      <div>{progressText}</div>
      <progress value={progress} />
    </div>
  {:else}
    <div class="label">Select or drop .sb3 file</div>
  {/if}
</label>

{#if uploadedProject}
  <div class="uploaded-project">
    <p>Success! Your project was uploaded. Here is your link:</p>
    <p><a data-sveltekit-reload href={projectURL}>{projectURL}</a></p>
    <p><b>During the early prototype period, all projects will be deleted randomly.</b></p>
    <p>Only you will be able to edit the project's information.</p>
  </div>
{/if}
