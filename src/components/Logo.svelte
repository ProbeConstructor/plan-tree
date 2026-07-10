<script lang="ts">
  let { size = 96 }: { size?: number } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 512 512"
  width={size}
  height={size}
  role="img"
  aria-label="Plan Tree"
>
  <defs>
    <linearGradient id="node-root" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <linearGradient id="node-level1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#4ade80"/>
    </linearGradient>
    <linearGradient id="node-level2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#2dd4bf"/>
    </linearGradient>
    <filter id="glow-lg">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="glow-sm">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Connection lines -->
  <g stroke="#22d3ee" stroke-width="5" fill="none" opacity="0.4" stroke-linecap="round">
    <line x1="256" y1="168" x2="156" y2="276"/>
    <line x1="256" y1="168" x2="356" y2="276"/>
    <line x1="156" y1="276" x2="88" y2="378"/>
    <line x1="156" y1="276" x2="224" y2="378"/>
    <line x1="356" y1="276" x2="288" y2="378"/>
    <line x1="356" y1="276" x2="424" y2="378"/>
  </g>

  <!-- Leaf nodes (bottom level) -->
  <g filter="url(#glow-sm)">
    <circle cx="88" cy="378" r="18" fill="url(#node-level2)" opacity="0.8"/>
    <circle cx="88" cy="378" r="6" fill="#0f172a" opacity="0.5"/>
    <circle cx="224" cy="378" r="18" fill="url(#node-level2)" opacity="0.8"/>
    <circle cx="224" cy="378" r="6" fill="#0f172a" opacity="0.5"/>
    <circle cx="288" cy="378" r="18" fill="url(#node-level2)" opacity="0.8"/>
    <circle cx="288" cy="378" r="6" fill="#0f172a" opacity="0.5"/>
    <circle cx="424" cy="378" r="18" fill="url(#node-level2)" opacity="0.8"/>
    <circle cx="424" cy="378" r="6" fill="#0f172a" opacity="0.5"/>
  </g>

  <!-- Mid-level nodes -->
  <g filter="url(#glow-lg)">
    <circle cx="156" cy="276" r="27" fill="url(#node-level1)"/>
    <circle cx="156" cy="276" r="10" fill="#0f172a" opacity="0.45"/>
    <circle cx="356" cy="276" r="27" fill="url(#node-level1)"/>
    <circle cx="356" cy="276" r="10" fill="#0f172a" opacity="0.45"/>
  </g>

  <!-- Root node -->
  <g filter="url(#glow-lg)">
    <circle cx="256" cy="142" r="42" fill="url(#node-root)"/>
    <circle cx="256" cy="142" r="16" fill="#0f172a" opacity="0.4"/>
  </g>
</svg>
