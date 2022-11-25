<script lang="ts">
  import {onMount} from 'svelte';

  export let projectId: string;
  export let md5extsToSha256: Record<string, string>;

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
        const sha256 = md5extsToSha256![md5ext];
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

  onMount(() => {
    // All navigations away from this page should completely reload the page.
    document.documentElement.setAttribute('data-sveltekit-reload', '');

    loadProject()
      .catch((e) => {
        error = e;
      });
  });
</script>

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
