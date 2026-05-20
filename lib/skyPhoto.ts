

export function getSkyPhoto(
  condition: string,
  timestamp: string,
  naritImageUrl?: string
): string {

  if (naritImageUrl) return naritImageUrl


  if (condition === 'Clear')         return '/sky-clear.jpg'
  if (condition === 'Partly Cloudy') return '/sky-partly.jpg'
  if (condition === 'Cloudy')        return '/sky-cloudy.jpg'
  return '/sky-overcast.jpg'
}