<script lang="ts">
  import { APP_NAME } from '$lib/config/brand';
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
  h1, h2, p, section {
    margin-top: 16px;
    margin-bottom: 16px;
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

  .warning {
    padding: 0.5em;
    margin: 0.5em 0;
    border-radius: 0.5em;
    background: rgba(255, 0, 0, 0.245);
    border: 1px solid rgba(255, 0, 0, 0.604);
    font-weight: bold;
  }
</style>

<section class="header">
  <h1>Welcome to <span class="fancy">{APP_NAME}.</span></h1>
  <p>Upload a .sb3 file and we'll generate a temporary link that anyone can use to view the project. The links are random, so people can only view the project if you share the link yourself.</p>
  <p class="warning">In the near future, projects that have not been used for at least 30 days may be automatically deleted.</p>
</section>

<section class="file">
  <ProjectInput />
</section>

<section class="questions">
  <h2>How do I get the .sb3 file to upload?</h2>
  <p>Go to Scratch &gt; Go to My Stuff &gt; Open your project &gt; See inside &gt; Open the "File" in the top left corner &gt; Press "Save to your computer" &gt; Upload the downloaded file to this site.</p>

  <h2>What projects am I allowed to upload?</h2>
  <p>If you follow the spirit of the <a href="https://scratch.mit.edu/community_guidelines">Scratch community guidelines</a>, then you have nothing to worry about.</p>

  <h2>How long do the links work for?</h2>
  <p>If a project has not been used for at least 30 days, it may automatically deleted. We may change this threshold up or down without warning. "Uptime checking" robots and other simple scripts will not reset this timer.</p>
  <p>Setting aside the 30 day timer, projects may also be deleted without warning if we need to clear space or make significant internal changes.</p>
  <p>You absolutely must not rely on these links to work long-term. We can not recover deleted projects no matter how important the project is.</p>

  <h2>Can I edit or delete the project?</h2>
  <p>The uploader of a project can delete it. Editing the project after uploading may be added later.</p>

  <h2>How do I sign in?</h2>
  <p>There are no accounts. You can only upload projects. We store a secret token in your browser's local storage when you upload a project instead of using accounts.</p>

  <h2>How large can projects be?</h2>
  <p>Similar limits to Scratch. The limits will be adjusted over time.</p>

  <h2>Do cloud variables work?</h2>
  <p>Yes.</p>

  <h2>Do custom extensions work?</h2>
  <p>Most extensions on <a href="https://extensions.turbowarp.org/">extensions.turbowarp.org</a> will work.</p>

  <h2>Where is the source code?</h2>
  <p><a href="https://github.com/GarboMuffin/placeholder/">https://github.com/GarboMuffin/placeholder/</a></p>
</section>
