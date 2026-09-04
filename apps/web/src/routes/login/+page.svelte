<script lang="ts">
  // Login page — placeholder, will be implemented in feature/auth/jwt-authentication
</script>

<main class="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
  <div class="w-full max-w-md space-y-6 px-6">
    <div class="text-center">
      <h1 class="text-3xl font-bold">NexusOps</h1>
      <p class="text-gray-400 mt-2">Sign in to your account</p>
    </div>

    <form class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          autocomplete="email"
          class="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          autocomplete="current-password"
          class="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Sign In
      </button>
    </form>
  </div>
</main>
