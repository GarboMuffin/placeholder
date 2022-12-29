<script lang="ts">
  import type {PageData} from './$types';
  import {page} from '$app/stores';
  import {getOwnershipToken} from '$lib/local-project-data';
  import { APP_NAME } from '$lib/config/brand';
  import ProjectRunner from '$lib/ProjectRunner.svelte';
  import { fetchWithErrorHandling } from '$lib/fetch';

  export let data: PageData;

  const DEFAULT_TITlE = 'Untitled';
  const DEFAULT_DESCRIPTION = 'No description';

  const projectId = $page.params.project;
  const ownershipToken = data.adminOwnershipToken || getOwnershipToken(projectId);
  const canEditProject = !!ownershipToken;
  let projectTitle = data.metadata.title;
  let projectDescription = data.metadata.description;

  let vm: any;

  const downloadProject = async () => {
    const blob = await vm.saveProjectSb3();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle}.sb3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const editProjectDescription = async (e: Event) => {
    const body = new FormData();
    body.set('ownershipToken', String(ownershipToken));
    body.set('description', (e.target as HTMLTextAreaElement).value);
    try {
      await fetchWithErrorHandling(`/api/projects/${projectId}`, {
        method: 'POST',
        body
      });
    } catch (e) {
      alert(e);
    }
  };

  const editProjectTitle = async (e: Event) => {
    const body = new FormData();
    body.set('ownershipToken', String(ownershipToken));
    const newTitle = (e.target as HTMLInputElement).value;
    projectTitle = newTitle;
    body.set('title', newTitle);
    try {
      await fetchWithErrorHandling(`/api/projects/${projectId}`, {
        method: 'POST',
        body
      });
    } catch (e) {
      alert(e);
    }
  };

  const deleteProject = async () => {
    if (confirm('Are you sure you want to delete the project? THIS CANNOT BE UNDONE.')) {
      const body = new FormData();
      body.set('ownershipToken', String(ownershipToken));
      try {
        await fetchWithErrorHandling(`/api/projects/${projectId}`, {
          method: 'DELETE',
          body
        });
        location.href = '/deleted';
      } catch (e) {
        alert(e);
      }
    }
  };

  let reportBody: string = '';
  let submittingReport: boolean = false;
  let submittedReport: boolean = false;
  const submitReport = async () => {
    submittingReport = true;

    const body = new FormData();
    body.set('projectId', projectId);
    body.set('body', reportBody);

    try {
      await fetchWithErrorHandling(`/api/projects/${projectId}/report`, {
        method: 'POST',
        body
      });

      alert([
        'A report has been submitted and will be reviewed by a volunteer. Thank you.\n\n',
        'Reporting a project multiple times does not change its place in the queue.'
      ].join(''));
      submittedReport = true;
    } catch (e) {
      alert(e);
    }

    submittingReport = false;
  };
</script>

<svelte:head>
  <title>{projectTitle || DEFAULT_TITlE} - {APP_NAME}</title>
  <meta name="robots" content="noindex">
  <meta name="description" content={projectDescription || DEFAULT_DESCRIPTION}>
  <meta property="og:type" content="website">
  <meta property="og:title" content={projectTitle || DEFAULT_TITlE}>
  <meta property="og:description" content={projectDescription || DEFAULT_DESCRIPTION}>
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
    margin: 1rem 0;
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
    padding: 0.5em;
    border-radius: 0.5em;
    margin: 1em 0;
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

  .report summary {
    cursor: pointer;
  }
  .report textarea {
    width: 100%;
    height: 100px;
    box-sizing: border-box;
  }
</style>

<div class="details">
  <input
    class="title"
    value={data.metadata.title}
    placeholder={DEFAULT_TITlE}
    on:change={editProjectTitle}
    autocomplete="off"
    readonly={!ownershipToken}
  >
</div>

<ProjectRunner
  projectId={projectId}
  md5extsToSha256={data.md5extsToSha256}
  bind:vm={vm}
/>

<div class="details">
  <textarea
    class="description"
    value={projectDescription}
    placeholder={DEFAULT_DESCRIPTION}
    on:change={editProjectDescription}
    autocomplete="off"
    readonly={!ownershipToken}
  ></textarea>

  <p>
    <button class="download" on:click={downloadProject}>Download project</button>
  </p>

  <details class="report">
    <summary>Report this project</summary>
    <p>
      <textarea
        bind:value={reportBody}
        placeholder="Explain why this project should be removed. Please be comprehensive. We won't be able to reach out for more information."
        readonly={submittingReport}
      ></textarea>
    </p>
    <p>
      <button
        class="submit-report"
        on:click={submitReport}
        disabled={submittingReport}
      >Submit report</button>
    </p>
  </details>

  {#if canEditProject}
    <div class="owner-section">
      <p>
        <button on:click={deleteProject}>Delete this project</button>
      </p>
    </div>
  {/if}
</div>
