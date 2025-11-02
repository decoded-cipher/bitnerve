
// Convert number to US currency format
export function formatToUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}


// Helper to format array data for display
export function formatArray(arr: number[], maxDisplay: number = 10): string {
  const displayArr = arr.length > maxDisplay ? arr.slice(-maxDisplay) : arr;
  return `[${displayArr.join(', ')}]`;
}


// Convert timestamp to readable date string in IST timezone
export function formatTimestampToIST(epochTime: number): string {
  const date = new Date(epochTime);
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}


// Calculate duration between timestamps in specified unit
export function calcDuration(startTime: number, endTime: number = Date.now(), unit: 'ms' | 's' | 'm' | 'h' | 'd' = 's'): number {
  if (!startTime) return 0;
  const diffMs = endTime - startTime;
  
  switch (unit) {
    case 'ms': return diffMs;
    case 's': return Math.floor(diffMs / 1000);
    case 'm': return Math.floor(diffMs / (1000 * 60));
    case 'h': return Math.floor(diffMs / (1000 * 60 * 60));
    case 'd': return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    default: return diffMs;
  }
}


// Format data to human-readable data
export function formatData(data: any[]): any[] {
  return data.map(item => ({
    ...item,
    o: item.o ? formatToUSD(parseFloat(item.o)) : item.o,
    h: item.h ? formatToUSD(parseFloat(item.h)) : item.h,
    l: item.l ? formatToUSD(parseFloat(item.l)) : item.l,
    c: item.c ? formatToUSD(parseFloat(item.c)) : item.c,
    start_time: item.start_time ? formatTimestampToIST(parseInt(item.start_time)) : item.start_time,
    close_time: item.close_time ? formatTimestampToIST(parseInt(item.close_time)) : item.close_time,
    volume: item.volume ? parseFloat(item.volume).toFixed(4) : item.volume,
  }));
}
