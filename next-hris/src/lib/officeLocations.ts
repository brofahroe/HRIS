// Koordinat Lokasi Kantor Batik Seng
// Galeri: 8°10'21.92"S 112°33'02.83"E -> lat: -8.17275556, lng: 112.55078611
// Sanggar: 8°10'34.72"S 112°32'53.04"E -> lat: -8.17631111, lng: 112.54806667
export const OFFICE_LOCATIONS = [
  {
    name: "Galeri Batik",
    lat: -8.17275556,
    lng: 112.55078611,
    dms: `8°10'21.92"S 112°33'02.83"E`,
  },
  {
    name: "Sanggar Batik",
    lat: -8.17631111,
    lng: 112.54806667,
    dms: `8°10'34.72"S 112°32'53.04"E`,
  },
];

// Radius maksimal absensi: 50 meter (0.05 km)
export const MAX_RADIUS_KM = 0.05;
export const MAX_RADIUS_METERS = 50;

// Haversine formula untuk menghitung jarak antara dua koordinat (dalam kilometer)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius bumi dalam km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findClosestOffice(lat: number, lng: number) {
  let minDistance = Infinity;
  let closestOffice = "";

  for (const office of OFFICE_LOCATIONS) {
    const distance = calculateDistance(office.lat, office.lng, lat, lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestOffice = office.name;
    }
  }

  return {
    minDistance,
    closestOffice,
    isWithinRadius: minDistance <= MAX_RADIUS_KM,
  };
}

