<svelte:head>
  <title>Unshared Project</title>
</svelte:head>

<style>
  .project-outer {
    position: relative;
    border: 1px solid black;
    margin: 20px auto;
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

  .loading-screen, .error-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: black;
    flex-direction: column;
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

  .error-details {
    font-family: monospace;
  }

  .details {
    max-width: 480px;
    margin: auto;
  }
</style>

<div
  class="project-outer"
  style:width={`${stageWidth}px`}
  style:height={`${stageHeight}px`}
>
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

  {#if error}
    <div class="error-screen">
      <p class="error-title">Error</p>
      <p class="error-details">{error}</p>
    </div>
  {/if}
</div>


<div class="details">
  <p>During the early prototype period, projects will be deleted at random.</p>

  {#if ownershipToken}
    <p>You own this project.</p>
    <button class="delete-button" on:click={deleteProject}>Delete</button>
  {/if}
</div>


<script lang="ts">
  import type {PageData} from './$types';
  import {page} from '$app/stores';
  import {browser} from '$app/environment';
  import {getOwnershipToken} from '$lib/local-project-data';

  export let data: PageData;

  const projectId = $page.params.project;
  const expirationDate = new Date(data.metadata.expires * 1000).toLocaleString();
  const ownershipToken = getOwnershipToken(projectId);

  let progress = 0;

  let scaffoldingContainer: HTMLElement;

  let isLoaded = false;
  let isStarted = false;
  let vm: any;
  let stageWidth: number = 480;
  let stageHeight: number = 360;
  let error: unknown;

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
      (asset: any) => {
        const md5ext = `${asset.assetId}.${asset.dataFormat}`;
        const sha256 = data.md5extsToSha256[md5ext];
        if (typeof sha256 !== 'string') {
          throw new Error(`Unknown asset ${md5ext}`);
        }
        return new URL(`/api/assets/${sha256}`, location.href).href;
      }
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
    loadProject()
      .catch((e) => {
        error = e;
      });
  }
</script>
