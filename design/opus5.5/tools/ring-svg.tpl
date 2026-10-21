<svg viewBox="0 0 400 400" role="img" aria-label="{{previewLabel}}" style="display: block; width: 100%; height: auto">
  <defs>
    <radialGradient id="k-bg" cx="50%" cy="38%" r="72%"><stop offset="0" stop-color="#2F5249"></stop><stop offset="1" stop-color="#142B25"></stop></radialGradient>
    <linearGradient id="k-au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6E5018"></stop><stop offset="0.3" stop-color="#E6C97E"></stop><stop offset="0.55" stop-color="#B38B3E"></stop><stop offset="0.78" stop-color="#F5E4B0"></stop><stop offset="1" stop-color="#86621F"></stop></linearGradient>
    <linearGradient id="k-ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#74787C"></stop><stop offset="0.3" stop-color="#F1F1EE"></stop><stop offset="0.55" stop-color="#AEB1B4"></stop><stop offset="0.78" stop-color="#FBFBF9"></stop><stop offset="1" stop-color="#83878B"></stop></linearGradient>
    <radialGradient id="k-gem" cx="38%" cy="30%" r="82%"><stop offset="0" stop-color="{{g1}}"></stop><stop offset="0.55" stop-color="{{g2}}"></stop><stop offset="1" stop-color="{{g3}}"></stop></radialGradient>
    <radialGradient id="k-side" cx="38%" cy="30%" r="82%"><stop offset="0" stop-color="#FFFFFF"></stop><stop offset="0.55" stop-color="#D9E2EA"></stop><stop offset="1" stop-color="#8D9DAC"></stop></radialGradient>
    <clipPath id="k-clip"><path d="{{gemPath}}"></path></clipPath>
    <clipPath id="k-sclip"><path d="{{sidePath}}"></path></clipPath>
  </defs>
  <rect width="400" height="400" fill="url(#k-bg)"></rect>
  <ellipse cx="200" cy="374" rx="110" ry="8" fill="#000000" opacity="0.22"></ellipse>
  <path d="{{bandPath}}" fill="{{bandFill}}" fill-rule="evenodd" stroke="#2B2414" stroke-opacity="0.35" stroke-width="1"></path>
  <path d="{{innerRing}}" fill="none" stroke="#000000" stroke-opacity="0.22" stroke-width="3"></path>
  <path d="{{highlight}}" fill="none" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="2.5" stroke-linecap="round"></path>
  <g display="{{paveDisplay}}"><path d="{{pavePath}}" fill="#F4F6F8" stroke="#7F8C98" stroke-width="0.8"></path></g>
  <g display="{{trioDisplay}}">
    <path d="{{sidePath}}" fill="url(#k-side)" stroke="#8D9DAC" stroke-width="1"></path>
    <path d="{{sideLines}}" clip-path="url(#k-sclip)" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.8"></path>
    <path d="{{sideTable}}" fill="none" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="0.8"></path>
    <path d="{{sideProngs}}" fill="{{headFill}}" stroke="#2B2414" stroke-opacity="0.4" stroke-width="0.8"></path>
  </g>
  <g display="{{haloDisplay}}">
    <path d="{{haloMetal}}" fill="none" stroke="{{headFill}}" stroke-width="15" stroke-linejoin="round"></path>
    <path d="{{haloDots}}" fill="#F4F6F8" stroke="#7F8C98" stroke-width="0.8"></path>
  </g>
  <g display="{{bezelDisplay}}"><path d="{{bezelPath}}" fill="{{headFill}}" stroke="#2B2414" stroke-opacity="0.45" stroke-width="1"></path></g>
  <path d="{{gemPath}}" fill="url(#k-gem)" stroke="{{gemStroke}}" stroke-width="1.2"></path>
  <path d="{{gemLines}}" clip-path="url(#k-clip)" fill="none" stroke="#FFFFFF" stroke-opacity="0.42" stroke-width="1"></path>
  <path d="{{gemTable}}" fill="#FFFFFF" fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1"></path>
  <path d="{{glint}}" fill="#FFFFFF" opacity="0.85"></path>
  <g display="{{prongDisplay}}"><path d="{{prongPath}}" fill="{{headFill}}" stroke="#2B2414" stroke-opacity="0.45" stroke-width="0.9"></path></g>
</svg>
