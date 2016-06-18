const React = require('react');

export default function Layout(props) {
  return (
    <html>
      <head>
        <title>{props.title}</title>
        <link rel='stylesheet' href='/main.css' />
      </head>
      <body>
        <div id="application-container" data-json={props.json}>
          {props.children}
        </div>
        <script src="/main.js"></script>
        <script src="https://use.fontawesome.com/d7ea6720b6.js" async></script>
      </body>
    </html>
  );
}
