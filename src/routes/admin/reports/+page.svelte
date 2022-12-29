<script lang="ts">
  import { fetchWithErrorHandling } from "$lib/fetch";
  import type { Report } from "$lib/server/db";
  import type { PageData } from "./$types";

  export let data: PageData;

  // I don't know why sveltekit isn't doing the types properly
  // @ts-expect-error
  const reports: Report[] = data.reports;

  let dismissedReports: number[] = [];

  const dismiss = async (id: number) => {
    try {
      await fetchWithErrorHandling(`/admin/api/reports/${id}`, {
        method: 'DELETE'
      });
      dismissedReports = [...dismissedReports, id];
    } catch (e) {
      alert(e);
    }
  };
</script>

<style>
  textarea {
    width: 500px;
    height: 100px;
    box-sizing: border-box;
  }

  .dismissed {
    text-decoration: line-through;
    opacity: 0.5;
  }
</style>

<p>There are {reports.length} report(s).</p>

{#each reports as report}
  <div class="report" class:dismissed={dismissedReports.includes(report.reportId)}>
    <h2><a href="/projects/{report.projectId}">{report.projectTitle}</a> {report.reportId}</h2>
    <p>Project description:</p>
    <textarea readonly autocomplete="off">{report.projectDescription}</textarea>
    <p>Report description:</p>
    <textarea readonly autocomplete="off">{report.reportBody}</textarea>
    <p>
      <button on:click={() => dismiss(report.reportId)}>Dismiss report</button>
    </p>
  </div>
{/each}
