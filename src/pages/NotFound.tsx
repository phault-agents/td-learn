import { href } from '../lib/router';

export function NotFound() {
  return (
    <div className="page notfound">
      <h1>Nothing cooks here.</h1>
      <p>That page doesn't exist — maybe its node got deleted.</p>
      <a className="btn btn-primary" href={href()}>
        Back home
      </a>
    </div>
  );
}
