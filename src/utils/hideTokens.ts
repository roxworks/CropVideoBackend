const accessorsToHide = ['accessToken', 'refreshToken', 'accessTokenExpires'];

const hideTokens = (data: any, depth = 0) => {
  if (depth > 5) {
    return {};
  }
  const newData = { ...data };
  // iterate over all accessors and replace them anywhere in newData
  // must also check for accessosr in nested objects in newData
  for (const accessor of accessorsToHide) {
    const accessorValue = newData[accessor];
    if (accessorValue) {
      newData[accessor] = 'HIDDEN';
    }
  }

  // iterate over all objects and nested objects in newData
  for (const key in newData) {
    if (newData[key] instanceof Object) {
      newData[key] = hideTokens(newData[key], depth + 1);
    }
  }

  return newData;
};

export default hideTokens;
