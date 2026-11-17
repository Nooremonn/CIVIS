const MAP = {
  pothole: 'Roads (C&W)',
  open_manhole: 'WASA',
  broken_streetlight: 'LG&CD',
};

exports.departmentFor = (hazardType) => MAP[hazardType];
