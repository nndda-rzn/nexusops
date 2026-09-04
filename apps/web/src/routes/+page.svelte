<script lang="ts">
  import { APP_ENV } from '@/core/config'
</script>

<main class="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
  <div class="text-center space-y-4">
    <h1 class="text-4xl font-bold tracking-tight">NexusOps</h1>
    <p class="text-gray-400 text-lg">
      Enterprise Integrated Operations Platform
    </p>
    <p class="text-gray-600 text-sm">
      Environment: {APP_ENV}
    </p>
    <div class="pt-4">
      <a
        href="/login"
        class="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Sign In
      </a>
    </div>
  </div>
</main>
