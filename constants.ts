
export const VAN_GOGH_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/800px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Vincent_Willem_van_Gogh_127.jpg/800px-Vincent_Willem_van_Gogh_127.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Vincent_Willem_van_Gogh_-_Wheat_Field_with_Crows_-_Google_Art_Project.jpg/800px-Vincent_Willem_van_Gogh_-_Wheat_Field_with_Crows_-_Google_Art_Project.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Starry_Night_Over_the_Rhone.jpg/800px-Starry_Night_Over_the_Rhone.jpg'
];

export const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

export const PARTICLE_COUNT = isMobile() ? 18000 : 40000;
export const CAMERA_WIDTH = 320;
export const CAMERA_HEIGHT = 240;
