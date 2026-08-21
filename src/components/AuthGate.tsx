import { useState, type FormEvent } from 'react';

const HASH = '0fa46c8cb639c882eba8fac0eb59c701a4735e16bc0b92a9da502a50e94ceb6b';

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface Props {
  onAuth: () => void;
}

export default function AuthGate({ onAuth }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError('');

    const hash = await sha256(password);
    if (hash === HASH) {
      sessionStorage.setItem('auth', hash);
      onAuth();
    } else {
      setError('Wrong password');
      setPassword('');
    }
    setChecking(false);
  };

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <h1>Matchup Dashboard</h1>
        <p>Enter the password to view stats</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            disabled={checking}
          />
          <button type="submit" disabled={checking || !password}>
            {checking ? 'Checking…' : 'Enter'}
          </button>
        </form>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
}