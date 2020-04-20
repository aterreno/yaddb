const yaddb = require('../src/yaddb')({
  endpoint: 'http://localhost:8000',
  accessKeyId: 'localAccessKey',
  secretAccessKey: 'localSecretAccessKey',
  region: 'localRegion',
});

const carDesc = require('./carDesc');

beforeAll(async (done) => {
  jest.setTimeout(10 * 1000);
  await yaddb.createTable({
    TableName: 'FunkyCars',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
      { AttributeName: 'status', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'N' },
      { AttributeName: 'status', AttributeType: 'S' },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 100,
      WriteCapacityUnits: 500,
    },
  });

  await Promise.all(
    [...Array(20).keys()].map(async (i) => {
      const putParams = {
        TableName: 'FunkyCars',
        Item: {
          id: i,
          type: `type-${i}`,
          name: `name-${i}`,
          manufacturer: `manufacturer-${i}`,
          fuel_type: 'electric',
          description: carDesc.desc,
          status: `ON_SALE_${i}`,
        },
      };
      await yaddb.put(putParams);
    })
  );

  done();
});

test('recursiveScan', async () => {
  const allCars = await yaddb.recursiveScan({
    TableName: 'FunkyCars',
    ProjectionExpression: 'id, #status, #name, #type, manufacturer, fuel_type',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#name': 'name',
      '#type': 'type',
    },
  });

  expect(allCars.length).toBe(20);
});

test('recursiveQuery', async () => {
  const putParams = {
    TableName: 'FunkyCars',
    Item: {
      id: 4,
      type: `type-4`,
      name: `name-4`,
      manufacturer: `manufacturer-4`,
      fuel_type: 'electric',
      description: carDesc.desc,
      status: `SOLD`,
    },
  };
  await yaddb.put(putParams);

  const allCars = await yaddb.recursiveQuery({
    TableName: 'FunkyCars',
    KeyConditionExpression: '#id = :id',
    ExpressionAttributeNames: {
      '#id': 'id',
    },
    ExpressionAttributeValues: {
      ':id': 4,
    },
  });

  expect(allCars.length).toBe(2);
});

afterAll(async (done) => {
  await yaddb.deleteTable({
    TableName: 'FunkyCars',
  });
  done();
});
