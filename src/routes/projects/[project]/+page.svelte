<svelte:head>
  <title>{projectTitle || 'Untitled'} - {APP_NAME}</title>
</svelte:head>

<style>
  .project-outer {
    position: relative;
    border: 1px solid black;
    margin: 16px auto;
    border-radius: 8px;
    overflow: hidden;
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

  .title {
    display: block;
    font: inherit;
    font-size: 2em;
    background: none;
    padding: 0;
    margin: 16px 0;
    border: none;
    width: 100%;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .description {
    display: block;
    font: inherit;
    width: 100%;
    max-width: 100%;
    min-width: 100%;
    min-height: 100px;
    padding: 8px;
    border-radius: 8px;
    margin: 16px 0;
    box-sizing: border-box;
    border: 1px solid #b9d6ff;
    background-color: #dbebff;
  }
  @media (prefers-color-scheme: dark) {
    .description {
      border-color: #2063c1;
      background-color: #184677;
    }
  }
</style>

<div class="details">
  <input
    class="title"
    value={data.metadata.title}
    placeholder="Untitled"
    on:change={editProjectTitle}
    autocomplete="off"
    readonly={!ownershipToken}
  >
</div>

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
  <textarea
    class="description"
    value={data.metadata.description}
    placeholder="No description"
    on:change={editProjectDescription}
    autocomplete="off"
    readonly={!ownershipToken}
  ></textarea>

  <p>During the early prototype period, projects will be deleted at random.</p>

  {#if ownershipToken}
    <div class="owner-section">
      <p>
        <button on:click={deleteProject}>Delete this project</button>
      </p>
    </div>
  {/if}
</div>

<script lang="ts">
  import type {PageData} from './$types';
  import {page} from '$app/stores';
  import {getOwnershipToken} from '$lib/local-project-data';
  import { onMount } from 'svelte';
  import { APP_NAME } from '$lib/brand';

  export let data: PageData;

  const projectId = $page.params.project;
  const ownershipToken = getOwnershipToken(projectId);
  let projectTitle = data.metadata.title;

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

    // @ts-expect-error
    await import('@turbowarp/packager/dist/scaffolding/scaffolding-full');
    // @ts-expect-error
    const Scaffolding: any = window.Scaffolding;

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
        const sha256 = data.md5extsToSha256![md5ext];
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

  const editProjectDescription = async (e: Event) => {
    const body = new FormData();
    body.set('ownershipToken', String(ownershipToken));
    body.set('description', (e.target as HTMLTextAreaElement).value);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'POST',
      body
    });
  };

  const editProjectTitle = async (e: Event) => {
    const body = new FormData();
    body.set('ownershipToken', String(ownershipToken));
    const newTitle = (e.target as HTMLInputElement).value;
    projectTitle = newTitle;
    body.set('title', newTitle);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'POST',
      body
    });
  };

  const deleteProject = async () => {
    if (confirm('Are you sure you want to delete the project?')) {
      const body = new FormData();
      body.set('ownershipToken', String(ownershipToken));
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        body
      });
    }
  };

  onMount(() => {
    if (data.metadata) {
      // All navigations away from this page should completely reload the page.
      document.documentElement.setAttribute('data-sveltekit-reload', '');
  
      loadProject()
        .catch((e) => {
          error = e;
        });
    }
  });
</script>
