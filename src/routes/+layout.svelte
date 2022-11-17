<style>
  :global(:root) {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  :global(body) {
    margin: 0;
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
    <span class="title">unshared</span> is not affiliated with Scratch, the Scratch Team, or the Scratch Foundation.
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
