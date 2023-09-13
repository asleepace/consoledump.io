import * as React from 'react';


export function App() {
  const [state, setState] = React.useState(0)
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/public/css/global.css"></link>
      </head>
      <body>
        <div id="root">
          <h1>Hello, world {state}</h1>
          <button onClick={() => setState(s => s + 1)}>ADD</button>
        </div>
      </body>
    </html>
  )
}