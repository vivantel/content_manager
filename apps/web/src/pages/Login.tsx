import { useAuthStore } from '../hooks/useAuthStore';

export function Login() {
  const { loginWithOAuth, checkAuth } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600">VivaScribe</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Content management from Git repositories
          </p>
        </div>

        <div className="card p-8">
          <div className="space-y-4">
            <button
              onClick={() => loginWithOAuth('github')}
              className="w-full btn-secondary flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.305-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>

            <button
              onClick={() => loginWithOAuth('gitlab')}
              className="w-full btn-secondary flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.431 2.5H2.569C1.15 2.5 0 3.614 0 5v14c0 1.386 1.15 2.5 2.569 2.5h18.862c1.419 0 2.569-1.114 2.569-2.5V5c0-1.386-1.15-2.5-2.569-2.5zm-11.898 9.004l-3.023 2.981v-4.53l3.023 2.975zm5.419 1.158c.329.312.494.728.494 1.184 0 .455-.165.871-.494 1.183l-2.903 2.788c-.68.68-1.783.68-2.463 0L6.478 14.17c-.68-.651-.68-1.72 0-2.4l2.59-2.553v-4.568l-2.59 2.552c-.68.68-.68 1.782 0 2.462l2.903 2.855c.329.311.494.727.494 1.183 0 .456-.165.871-.494 1.183l-3.023 2.981c-1.082 1.047-2.873 1.064-3.938 0-.361-.107-1.922-1.153-1.583-3.734.373-2.847 3.583-5.174 6.884-5.581v-1.181c0-.62.309-1.158.78-1.47l3.022-2.982c1.081-1.048 2.873-1.064 3.938 0 .36.107 1.921 1.153 1.582 3.733-.372 2.847-3.583 5.174-6.884 5.58v1.181c-.62 0-1.158-.31-1.47-.78zm-1.858-5.775v-2.976l2.463-2.427c.68-.68 1.782-.68 2.463 0l2.903 2.855v5.71l-2.902 2.854c-.68.68-1.783.68-2.463 0l-2.903-2.855v-5.71z"/>
              </svg>
              <span>Continue with GitLab</span>
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}