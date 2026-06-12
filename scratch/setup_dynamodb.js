require('dotenv').config({ path: '.env.local' });
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const region = process.env.AWS_REGION || 'eu-north-1';
const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const tables = [
  {
    TableName: 'UserStreaks',
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'UserProgress',
    KeySchema: [{ AttributeName: 'userId_roadmapId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'userId_roadmapId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'DailyChallengeLogs',
    KeySchema: [{ AttributeName: 'challengeId_userId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'challengeId_userId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST'
  }
];

async function main() {
  for (const tableConfig of tables) {
    console.log(`Checking table: ${tableConfig.TableName}...`);
    try {
      await client.send(new DescribeTableCommand({ TableName: tableConfig.TableName }));
      console.log(`Table ${tableConfig.TableName} already exists.`);
    } catch (err) {
      if (err.name === 'ResourceNotFoundException') {
        console.log(`Table ${tableConfig.TableName} not found. Creating...`);
        try {
          await client.send(new CreateTableCommand(tableConfig));
          console.log(`Table ${tableConfig.TableName} creation initiated successfully.`);
        } catch (createErr) {
          console.error(`Failed to create table ${tableConfig.TableName}:`, createErr.message);
        }
      } else {
        console.error(`Error describing table ${tableConfig.TableName}:`, err.message);
      }
    }
  }
}

main();
