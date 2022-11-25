<script lang="ts">
  import { APP_NAME } from '$lib/brand';
  import ProjectInput from '$lib/ProjectInput.svelte';
</script>

<svelte:head>
  <title>{APP_NAME}</title>
</svelte:head>

<style>
  section {
    max-width: 600px;
    margin: auto;
  }
  h1, h2, p {
    margin: 16px 0;
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
    -webkit-background-clip: text;
    background-clip: text;
    background-image: linear-gradient(to right, #a31aff, #e44cff);
  }

  .questions h2 {
    font-weight: normal;
  }
</style>

<section class="header">
  <h1>Welcome to <span class="fancy">{APP_NAME}.</span></h1>
  <p>Working title. Early protoype.</p>
  <p>Select or drop a .sb3 file and we'll create a temporary link that anyone can use to view the project.</p>
</section>

<section class="file">
  <ProjectInput />
</section>

<section class="questions">
  <h2>How do I get the .sb3 file?</h2>
  <p>Go to Scratch &gt; Go to My Stuff &gt; Open your project &gt; See inside &gt; Open the "File" in the top left corner &gt; Press "Save to your computer" &gt; Upload the downloaded file to this site.</p>

  <h2>Can I share links to this site on Scratch?</h2>
  <p>It is not advised to.</p>

  <h2>Who can view the project?</h2>
  <p>Anyone with the link. Our project IDs are random, so people won't be able to find your project by guessing.</p>

  <h2>How long do the links work for?</h2>
  <p>During the early prototype period, projects will be deleted at random times. Long-term, we'd like links to work for somewhere between a few days and a month. Storing projects permanetly is expensive and other places do it better than we can.</p>

  <h2>Where is the pause button, gamepad, and the other addons?</h2>
  <p>Working on it.</p>

  <h2>Can I delete the project?</h2>
  <p>The uploader of a project can delete it at any time (we store a secret token in your browser to prove ownership). Once projects are deleted, they are <i>actually</i> deleted. We don't keep extra copies of projects or unused assets.</p>

  <h2>How do I sign in?</h2>
  <p>You don't. There are no accounts. Just upload a project.</p>

  <h2>Where is the source code?</h2>
  <p>Will be available soon. Making this easy to self-host is a priority.</p>
</section>
