<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { login } from '@/core/auth'

  let email = $state('')
  let password = $state('')
  let isLoading = $state(false)
  let error = $state<string | null>(null)

  const redirectTo = $derived($page.url.searchParams.get('redirect') ?? '/dashboard')

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    error = null
    isLoading = true

    try {
      await login({ email, password })
      await goto(redirectTo)
    } catch (err: unknown) {
      const apiError = err as { detail?: string; title?: string }
      error = apiError?.detail ?? apiError?.title ?? 'Login failed. Please try again.'
    } finally {
      isLoading = false
    }
  }
</script>

<main class="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
  <div class="w-full max-w-md space-y-6">
    <div class="text-center">
      <h1 class="text-3xl font-bold tracking-tight">NexusOps</h1>
      <p class="text-gray-400 mt-2 text-sm">Enterprise Logistics Operations Platform</p>
    </div>

    <form
      onsubmit={handleSubmit}
      class="space-y-4 bg-gray-900 border border-gray-800 rounded-xl p-6"
    >
      <h2 class="text-lg font-semibold text-gray-100">Sign in</h2>

      {#if error}
        <div
          class="px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm"
          role="alert"
        >
          {error}
        </div>
      {/if}

      <div class="space-y-1">
        <label for="email" class="block text-sm font-medium text-gray-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          autocomplete="email"
          disabled={isLoading}
          class="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                 text-gray-100 placeholder-gray-500
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="you@company.com"
        />
      </div>

      <div class="space-y-1">
        <label for="password" class="block text-sm font-medium text-gray-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          autocomplete="current-password"
          disabled={isLoading}
          class="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                 text-gray-100 placeholder-gray-500
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !email || !password}
        class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800
               disabled:cursor-not-allowed text-white font-medium rounded-lg
               transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
               focus:ring-offset-gray-900"
      >
        {#if isLoading}
          <span class="inline-flex items-center gap-2">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Signing in...
          </span>
        {:else}
          Sign In
        {/if}
      </button>
    </form>
  </div>
</main>
