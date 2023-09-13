import * as React from 'react';

export function App() {
  const [state, setState] = React.useState(0)
  return (
    <div id="root">
      <h1>Hello, world {state}</h1>
      <button onClick={() => setState(s => s + 1)}>ADD</button>
    </div>
  )
}