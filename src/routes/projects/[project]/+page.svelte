<script lang="ts">
  import type {PageData} from './$types';
  import {page} from '$app/stores';
  import {getOwnershipToken} from '$lib/local-project-data';
  import { APP_NAME } from '$lib/brand';
  import ProjectRunner from '$lib/ProjectRunner.svelte';

  export let data: PageData;

  const projectId = $page.params.project;
  const ownershipToken = getOwnershipToken(projectId);
  let projectTitle = data.metadata.title;

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
</script>

<svelte:head>
  <title>{projectTitle || 'Untitled'} - {APP_NAME}</title>
</svelte:head>

<style>
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

<ProjectRunner
  projectId={projectId}
  md5extsToSha256={data.md5extsToSha256}
/>

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
