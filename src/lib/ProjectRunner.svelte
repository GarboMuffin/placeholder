<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { fetchWithErrorHandling } from './fetch';
  import greenFlagSVG from './icons/green-flag-button.svg';
  import stopButtonSVG from './icons/stop-button.svg';
  import fullscreenButtonSVG from './icons/fullscreen-button.svg';
  import unfullscreenButtonSVG from './icons/unfullscreen-button.svg';

  export let projectId: string;
  export let md5extsToSha256: Record<string, string>;

  let progress = 0;

  let scaffoldingElement: HTMLElement;
  let containerElement: HTMLElement;

  let isLoaded = false;
  let isStarted = false;
  let isFullscreen = false;

  export let vm: any;
  let stageWidth: number = 480;
  let stageHeight: number = 360;
  let error: unknown;

  const getProjectData = async () => {
    return await (await fetchWithErrorHandling(`/api/projects/${projectId}`)).arrayBuffer();
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
    scaffolding.appendTo(scaffoldingElement);
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

    const greenFlag = document.createElement('button');
    greenFlag.className = 'control-button';
    greenFlag.addEventListener('click', pressGreenFlag);
    greenFlag.addEventListener('click', () => {
      greenFlag.remove();
    });
    const greenFlagIcon = document.createElement('img');
    greenFlagIcon.src = greenFlagSVG;
    greenFlag.appendChild(greenFlagIcon);
    scaffolding.addControlButton({
      element: greenFlag,
      where: 'top-left'
    });
    vm.on('PROJECT_RUN_START', () => {
      greenFlag.classList.add('active');
      if (flagScreen.isConnected) {
        flagScreen.remove();
      }
    });
    vm.on('PROJECT_RUN_STOP', () => {
      greenFlag.classList.remove('active');
    });

    const stopAll = document.createElement('button');
    stopAll.className = 'control-button';
    stopAll.addEventListener('click', pressStopAll);
    const stopAllIcon = document.createElement('img');
    stopAllIcon.src = stopButtonSVG;
    stopAll.appendChild(stopAllIcon);
    scaffolding.addControlButton({
      element: stopAll,
      where: 'top-left'
    });

    const fullscreen = document.createElement('button');
    const pressFullscreen = async () => {
      if (isFullscreen) {
        document.exitFullscreen();
      } else {
        containerElement.requestFullscreen();
      }
    };
    const updateFullscreenIcon = () => {
      fullscreenIcon.src = isFullscreen ? unfullscreenButtonSVG : fullscreenButtonSVG;
    };
    document.addEventListener('fullscreenchange', () => {
      isFullscreen = !!document.fullscreenElement;
      updateFullscreenIcon();
    });
    fullscreen.className = 'control-button fullscreen-button';
    fullscreen.addEventListener('click', pressFullscreen);
    const fullscreenIcon = document.createElement('img');
    updateFullscreenIcon();
    fullscreen.appendChild(fullscreenIcon);
    scaffolding.addControlButton({
      element: fullscreen,
      where: 'top-right'
    });

    const flagScreen = document.createElement('button');
    flagScreen.className = 'flag-screen';
    flagScreen.addEventListener('click', pressGreenFlag);
    flagScreen.addEventListener('click', () => {
      flagScreen.remove();
    });
    const flagScreenIconOuter = document.createElement('div');
    flagScreenIconOuter.className = 'flag-icon';
    const flagScreenIcon = document.createElement('img');
    flagScreenIcon.src = greenFlagSVG;
    flagScreenIconOuter.appendChild(flagScreenIcon);
    flagScreen.appendChild(flagScreenIconOuter);
    scaffolding._addLayer(flagScreen);

    await scaffolding.loadProject(projectData);
    isLoaded = true;
  };

  const pressGreenFlag = () => {
    vm.greenFlag();
    vm.start();
    isStarted = true;
  };

  const pressStopAll = () => {
    vm.stopAll();
  };

  onMount(() => {
    // All navigations away from this page should completely reload the page.
    document.documentElement.setAttribute('data-sveltekit-reload', '');

    loadProject()
      .catch((e) => {
        error = e;
      });
  });

  onDestroy(() => {
    if (vm) {
      vm.runtime.dispose();
      vm.stop();
    }
  });
</script>

<style>
  .container {
    margin: 1em auto;
    display: flex;
    flex-direction: column;
    position: relative;
    height: 100%;
  }

  .container > * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .loading :global(.sc-root) {
    visibility: hidden;
  }
  :global(.sc-canvas) {
    border-radius: 0.5em;
    box-shadow: 0 0 0 1px #aaa;
  }
  @media (prefers-color-scheme: dark) {
    :global(.sc-canvas) {
      box-shadow: 0 0 0 1px #555;
    }
  }
  .fullscreen :global(.sc-canvas) {
    box-shadow: none;
    border-radius: 0;
  }

  :global(.flag-screen) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    padding: 0;
    margin: 0;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: rgba(0, 0, 0, 0.5);
    color: green;
    font-size: 72px;
    cursor: pointer;
  }
  :global(.flag-icon) {
    width: 80px;
    height: 80px;
    padding: 16px;
    border-radius: 100%;
    background: rgba(255, 255, 255, 0.75);
    border: 3px solid hsla(0, 100%, 100%, 1);
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
  }

  .loading-screen, .error-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: black;
    color: white;
    flex-direction: column;
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

  .error-title {
    font-size: 2em;
    margin: 0;
  }
  .error-details {
    font-family: monospace;
  }

  :global(.control-button) {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    width: 2rem;
    height: 2rem;
    padding: 0.375rem;
    border: none;
    border-radius: 0.25rem;
    margin: 0.5rem 0;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    border: 0;
    border-radius: 4px;
  }
  :global(.control-button:hover) {
    background: rgba(128, 0, 128, 0.2);
  }
  :global(.control-button.active) {
    background: rgba(128, 0, 128, 0.4);
  }
  :global(.fullscreen-button) {
    background: white !important;
    border: 1px solid rgba(0, 0, 0, 0.15);
  }
</style>

<div
  class="container"
  class:loading={!isLoaded}
  class:fullscreen={isFullscreen}
  style:width={`${stageWidth}px`}
  style:height={`${stageHeight + 48}px`}
  bind:this={containerElement}
>
  <div
    class="project-screen"
    bind:this={scaffoldingElement}
  ></div>

  {#if !isLoaded}
    <div class="loading-screen">
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
