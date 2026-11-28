import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="not-found-code">404</p>
      <h1>Page not found</h1>
      <p>The page you requested doesn’t exist or may have moved.</p>
      <Link className="button button-primary" to="/">
        Back to dashboard
      </Link>
    </main>
  );
}
