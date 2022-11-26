<script>
  import { APP_NAME } from '$lib/config/brand';
</script>

<style>
  :global(body) {
    margin: 0;
  }

  :root {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      background: #111;
      color: #eee;
    }
  }

  .title {
    color: rgb(210, 0, 210);
    font-weight: bold;
  }

  footer {
    margin: 16px 0;
    color: #555;
    display: flex;
    align-items: center;
    flex-direction: column;
    text-align: center;
  }
  @media (prefers-color-scheme: dark) {
    footer {
      color: #aaa;
    }
  }
  footer > * {
    margin: 10px 0;
  }
  footer a {
    color: inherit;
    text-decoration: none;
  }
  footer a:hover {
    text-decoration: underline;
  }

  .links {
    display: flex;
  }
  .link-gap {
    width: 16px;
  }
</style>

<slot></slot>

<footer>
  <div class="disclaimer">
    <span class="title">{APP_NAME}</span> is not affiliated with Scratch, the Scratch Team, or the Scratch Foundation.
  </div>

  <div class="links">
    <a href="/">Home</a>
    <div class="link-gap" />
    <a href="https://github.com/sponsors/GarboMuffin">Donate</a>
    <div class="link-gap" />
    <a href="/privacy">Privacy</a>
    <div class="link-gap" />
    <a href="/contact">Contact &amp; DMCA</a>
  </div>
</footer>
