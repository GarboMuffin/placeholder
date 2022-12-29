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
  }
</style>

<section class="header">
  <h1>Welcome to <span class="fancy">{APP_NAME}.</span></h1>
  <p>Upload a .sb3 file and we'll generate a secure random link that <i>anyone</i> can use to view the project.</p>
  <p class="warning">This is an experiment. Projects may be deleted randomly. Please <a href="https://github.com/GarboMuffin/placeholder/issues/new">report bugs</a>.</p>
</section>

<section class="file">
  <ProjectInput />
</section>

<section class="questions">
  <h2>How do I get the .sb3 file to upload?</h2>
  <p>Go to Scratch &gt; Go to My Stuff &gt; Open your project &gt; See inside &gt; Open the "File" in the top left corner &gt; Press "Save to your computer" &gt; Upload the downloaded file to this site.</p>

  <h2>What projects am I allowed to upload?</h2>
  <p>If you follow the <a href="https://scratch.mit.edu/community_guidelines">Scratch community guidelines</a>, then you have nothing to worry about. We will emphasize a few points (noncomprehensive):</p>
  <ul>
    <li>No hate speech.</li>
    <li>No spreading personal information.</li>
    <li>Nothing that is illegal in the United States of America.</li>
  </ul>

  <h2>How long do the links work for?</h2>
  <p>During the experiment period, projects may be removed at random. We aren't going out of our way to delete projects, but when we have to make significant database changes, we probably won't write migration code.</p>
  <p>In the future, we intend to make the links work for as long as reasonably possible. We're not sure what exactly that means right now.</p>

  <h2>Can I edit or delete the project?</h2>
  <p>The uploader of a project can delete it. Editing the project after uploading may be added later.</p>

  <h2>How do I sign in?</h2>
  <p>There are no accounts. You can only upload projects. We store a secret token in your browser's local storage when you upload a project instead of using accounts.</p>

  <h2>How large can projects be?</h2>
  <p>Similar limits to Scratch. The limits will be adjusted over time.</p>

  <h2>Notable missing features that will be added eventually</h2>
  <ul>
    <li>Built-in editor</li>
    <li>Addons</li>
    <li>Editing uploaded projects</li>
    <li>Cloud variables</li>
  </ul>

  <h2>Where is the source code?</h2>
  <p><a href="https://github.com/GarboMuffin/placeholder/">https://github.com/GarboMuffin/placeholder/</a></p>
</section>
