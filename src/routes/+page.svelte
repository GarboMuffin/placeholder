<svelte:head>
  <title>unshared</title>
</svelte:head>

<style>
  section {
    max-width: 600px;
    margin: auto;
  }

  .header {
    text-align: center;
  }
  h1 {
    font-size: 3em;
    font-weight: normal;
  }
  .fancy {
    font-weight: bold;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    background-image: linear-gradient(to right, #a31aff, #e44cff);
  }

  .file {

  }

  .questions h2 {
    font-weight: normal;
  }
</style>

<section class="header">
  <h1>Welcome to <span class="fancy">unshared.</span></h1>
  <p>Select or drop a .sb3 file and we'll create a temporary link that anyone can use to view the project.</p>
</section>

<section class="file">
  <ProjectInput />
</section>

<section class="questions">
  <h2>How do I get the .sb3 file?</h2>
  <p>Go to Scratch &gt; Go to My Stuff &gt; Open your project &gt; See inside &gt; Open the "File" in the top left corner &gt; Press "Save to your computer" &gt; Upload this project to unshared.</p>

  <h2>Who can view the project?</h2>
  <p>Anyone with the link. Unlike Scratch, our project IDs are random, so people won't be able to find your project by random chance</p>

  <h2>How long do the links work for?</h2>
  <p>During the early prototype period, assume they won't work for more than a couple hours regardless of what the website says.</p>

  <h2>Where is the pause button, gamepad, and the other addons?</h2>
  <p>Working on it.</p>

  <h2>Can I or other people edit the project?</h2>
  <p>Working on adding options for this.</p>

  <h2>Can I delete the project?</h2>
  <p>The uploader of a project can delete it at any time (we store a secret token in your browser to prove project ownership). Once projects are deleted, they are <i>really</i> deleted. We don't keep extra copies of projects or unused assets.</p>

  <h2>How do I sign in?</h2>
  <p>You don't. There are no accounts. Maybe eventually we will.</p>

  <h2>How can I make projects be stored forever?</h2>
  <p>Not possible right now.</p>

  <h2>Source code?</h2>
  <p>Soon.</p>
</section>

<script lang="ts">
  import type { IncompleteProject } from '$lib/server/db';
  import ProjectInput from '$lib/ProjectInput.svelte';
</script>
