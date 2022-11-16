<style>
  .project-outer {
    position: relative;
    width: 480px;
    height: 360px;
    border: 1px solid black;
  }

  .project-outer > * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .flag-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.5);
    color: green;
    font-size: 72px;
    text-align: center;
    cursor: pointer;
  }

  .loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: black;
    flex-direction: column;
  }
  .loading-text {
    color: white;
  }
  .loading-bar-outer {
    width: 200px;
    height: 10px;
    position: relative;
    border: 1px solid white;
  }
  .loading-bar-inner {
    height: 100%;
    width: 0;
    background: white;
  }
</style>

<div class="project-outer">
  <div class="project-screen" bind:this={scaffoldingContainer}></div>

  {#if !isStarted}
    <div class="flag-screen" on:click={greenFlag}>
      <p>Click to start project</p>
    </div>
  {/if}

  {#if !isLoaded}
    <div class="loading-screen">
      <p class="loading-text">Loading</p>
      <div class="loading-bar-outer">
        <div class="loading-bar-inner" style:width={`${progress * 100}%`}></div>
      </div>
    </div>
  {/if}
</div>

<div class="metadata-section">
  <p>This project will be deleted on <span class="expiration-date">{expirationDate}</span>.</p>
</div>

{#if ownershipToken}
  <div class="owner-section">
    <p>You own this project.</p>
    <button class="delete-button" on:click={deleteProject}>Delete</button>
  </div>
{/if}

<script lang="ts">
  import type {PageData} from './$types';
  import {page} from '$app/stores';
  import {browser} from '$app/environment';
  import {getOwnershipToken} from '$lib/local-project-data';
  export let data: PageData;

  const projectId = $page.params.project;
  const expirationDate = new Date(data.expires * 1000).toLocaleString();
  const ownershipToken = getOwnershipToken(projectId);

  let progress = 0;

  let scaffoldingContainer: HTMLElement;

  let isLoaded = false;
  let isStarted = false;
  let vm: any;

  const getProjectData = async () => {
    return await (await fetch(`/api/projects/${projectId}`)).arrayBuffer();
  };

  const loadProject = async () => {
    const projectData = await getProjectData();
    progress = 0.1;

    await import('@turbowarp/packager/dist/scaffolding/scaffolding-full');
    const scaffolding = new Scaffolding.Scaffolding();
    scaffolding.setup();
    scaffolding.appendTo(scaffoldingContainer);
    progress = 0.2;

    vm = scaffolding.vm;

    const storage = scaffolding.storage;
    storage.addWebStore(
      [storage.AssetType.ImageVector, storage.AssetType.ImageBitmap, storage.AssetType.Sound],
      (asset: any) => new URL(`/api/assets/${asset.assetId}.${asset.dataFormat}`, location.href).href
    );
    storage.onprogress = (total: number, loaded: number) => {
      progress = 0.2 + (loaded / total) * 0.8;
    };

    await scaffolding.loadProject(projectData);
    isLoaded = true;
  };

  const greenFlag = () => {
    vm.greenFlag();
    vm.start();
    isStarted = true;
  };

  const deleteProject = async () => {
    await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        ownershipToken
      })
    });
    alert('Deleted');
  };

  if (browser) {
    loadProject();
  }
</script>
