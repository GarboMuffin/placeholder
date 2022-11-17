<script lang="ts">
  import { page } from '$app/stores';

  // This is the error page, so we know that there will always be an error object.
  const error = $page.error!;
</script>

<style>
  main {
    max-width: 480px;
    margin: auto;
  }
</style>

<main>
  <h1>Error {$page.status}</h1>
  <p>{error.message}</p>
</main>
