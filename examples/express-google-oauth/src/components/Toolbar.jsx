const React = require('react');

function Toolbar(props) {
  const {flash, profile} = props;
  let flashElements = [];
  if (flash)
    for (let m in flash)
      for (let [n, o] of flash[m].entries())
        flashElements.push(
          <div key={m+n} className={`toolbar__alert toolbar__alert--${m}`}>{o}</div>);
  return (
    <div className="toolbar">
      <div className="toolbar__title">
        express-google-oauth example
      </div>
      {flashElements}
      {profile
        ? <a className="toolbar__user" href="/logout" title="Click to logout">
            <img className="toolbar__user-img" src={profile.picture} />
            <span className="toolbar__user-name">{profile.name}</span>
          </a>
        : <a className="toolbar__user" href="/login">Login</a>
      }
    </div>
  );
}

module.exports = Toolbar;
