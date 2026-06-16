import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";
import { Signer } from "@aws-sdk/rds-signer";

const databaseUrl = process.env.DATABASE_URL;

// Prevent multiple pools in development due to hot reloads
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  useMock: boolean | undefined;
};

let pool: Pool;

const dbUrlStr = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/silkroad";
const isRemoteDb = dbUrlStr.includes(".rds.amazonaws.com") || dbUrlStr.includes(".supabase.co") || dbUrlStr.includes(".neon.tech");

if (dbUrlStr.includes(".rds.amazonaws.com") && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  try {
    const parsedUrl = new URL(dbUrlStr);
    const hostname = parsedUrl.hostname;
    const port = parseInt(parsedUrl.port || "5432", 10);
    const username = parsedUrl.username || "postgres";
    const databaseName = parsedUrl.pathname.replace(/^\//, "") || "postgres";
    const region = process.env.AWS_REGION || "eu-north-1";

    const signer = new Signer({
      hostname,
      port,
      username,
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    pool = globalForDb.pool ?? new Pool({
      host: hostname,
      port: port,
      database: databaseName,
      user: username,
      password: async () => {
        return await signer.getAuthToken();
      },
      max: 10,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 15000,
      ssl: {
        rejectUnauthorized: false
      }
    });
  } catch (err) {
    console.error("Failed to parse RDS IAM Auth configuration. Falling back to standard Pool connection.", err);
    pool = globalForDb.pool ?? new Pool({
      connectionString: dbUrlStr,
      max: 10,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 15000,
    });
  }
} else {
  pool = globalForDb.pool ?? new Pool({
    connectionString: dbUrlStr,
    max: 10,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 15000,
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

const realDb = drizzle(pool, { schema });

// Filesystem mock database file path - use /tmp on Vercel to avoid EROFS (Read-only filesystem)
const isVercel = 
  process.env.VERCEL === "1" || 
  process.env.VERCEL === "true" ||
  process.env.LAMBDA_TASK_ROOT !== undefined ||
  process.cwd() === "/var/task" ||
  process.cwd().includes("/var/task");

const dbFilePath = isVercel
  ? path.join("/tmp", "in-memory-db.json")
  : path.join(process.cwd(), "in-memory-db.json");

// Helper to load mock DB from filesystem
function loadInMemoryDb() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load in-memory-db.json", err);
  }
  return {
    users: [],
    mentors: [],
    bookings: [],
    transactions: [],
    roadmaps: [],
    forum_posts: [],
    assessments: [],
    verification_tokens: []
  };
}

// Helper to save mock DB to filesystem
function saveInMemoryDb(data: any) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save in-memory-db.json", err);
  }
}

// Helper to get the correct table name string from Drizzle object
function getTableName(tableObj: any): string {
  if (!tableObj) return "";
  if (tableObj === schema.users) return "users";
  if (tableObj === schema.mentors) return "mentors";
  if (tableObj === schema.bookings) return "bookings";
  if (tableObj === schema.transactions) return "transactions";
  if (tableObj === schema.roadmaps) return "roadmaps";
  if (tableObj === schema.forumPosts) return "forum_posts";
  if (tableObj === schema.assessments) return "assessments";
  if (tableObj === schema.verificationTokens) return "verification_tokens";
  return tableObj.tableName || (tableObj._ && tableObj._.name) || "";
}

// Initialize default traveler record in fallback store
const checkDb = loadInMemoryDb();
if (checkDb.users.length === 0) {
  checkDb.users.push({
    id: "user_test",
    email: "traveler@silkroad.com",
    role: "traveler",
    experienceLevel: "beginner",
    targetRole: "Software Engineer",
    currentStatus: "normal",
    onboardingChatState: null,
    createdAt: new Date().toISOString()
  });
  saveInMemoryDb(checkDb);
}
if (!checkDb.assessments) {
  checkDb.assessments = [];
  saveInMemoryDb(checkDb);
}

// Seed mock mentors in fallback store if empty
if (!checkDb.mentors || checkDb.mentors.length === 0) {
  checkDb.mentors = [
    {
      id: "d1245781-cc67-4221-88c9-aaee334455bb",
      userId: "user_test_battuta",
      specialization: "System Design & Global Cloud Architectures",
      hourlyRate: 7500,
      rating: "4.9",
      bio: "Traveled across AWS clusters, configuring high-availability database regions and DynamoDB partitions globally."
    },
    {
      id: "e2245782-dd68-4332-99da-bbee445566cc",
      userId: "user_test_polo",
      specialization: "Next.js 14, React & Core UX Craftsmanship",
      hourlyRate: 6000,
      rating: "5.0",
      bio: "Crafts beautifully interactive fullstack client layouts. Passionate about animations and CSS design tokens."
    },
    {
      id: "f3245783-ee69-4443-a0eb-ccee556677dd",
      userId: "user_test_idrisi",
      specialization: "Geographic Data Visualizations & Interactive Maps (Three.js/D3)",
      hourlyRate: 8000,
      rating: "4.8",
      bio: "Charts path visualization routes. Expert in dynamic SVG bezier curves, interactive HTML Canvas, and WebGL map rendering."
    },
    {
      id: "a4245784-ff70-4554-b1ec-ddee667788ee",
      userId: "user_test_zhenghe",
      specialization: "High-Throughput Databases & Distributed Ledger Transactions",
      hourlyRate: 9000,
      rating: "4.9",
      bio: "Commands fleets of serverless Postgres databases. Expert in database partitioning, multi-region failovers, and ACID transactions."
    }
  ];
  if (!checkDb.users) checkDb.users = [];
  const mockUsers = [
    { id: "user_test_battuta", email: "battuta@silkroad.com", role: "mentor", coinsBalance: 0, streakShields: 0 },
    { id: "user_test_polo", email: "polo@silkroad.com", role: "mentor", coinsBalance: 0, streakShields: 0 },
    { id: "user_test_idrisi", email: "idrisi@silkroad.com", role: "mentor", coinsBalance: 0, streakShields: 0 },
    { id: "user_test_zhenghe", email: "zhenghe@silkroad.com", role: "mentor", coinsBalance: 0, streakShields: 0 }
  ];
  mockUsers.forEach((mu: any) => {
    if (!checkDb.users.some((u: any) => u.id === mu.id)) {
      checkDb.users.push({ ...mu, createdAt: new Date().toISOString() });
    }
  });
  saveInMemoryDb(checkDb);
}

// Flag to switch to mock database if Postgres is offline
const forceMock = process.env.USE_MOCK_DB === "true";
let useMock = forceMock || (!isRemoteDb && (globalForDb.useMock ?? false));

if (forceMock) {
  useMock = true;
  globalForDb.useMock = true;
} else if (!process.env.DATABASE_URL) {
  useMock = true;
  globalForDb.useMock = true;
}

// Fast connection check on startup
if (!useMock) {
  pool.query("SELECT 1")
    .then(async () => {
      console.log("✅ PostgreSQL is online. Using RDS Aurora DB.");
      try {
        const checkMentors = await realDb.select().from(schema.mentors).limit(1);
        if (checkMentors.length === 0) {
          console.log("🌱 Seeding default mentors in RDS PostgreSQL...");
          
          const seedUsers = [
            { id: "user_test_battuta", email: "battuta@silkroad.com", role: "mentor" as const, coinsBalance: 0, streakShields: 0 },
            { id: "user_test_polo", email: "polo@silkroad.com", role: "mentor" as const, coinsBalance: 0, streakShields: 0 },
            { id: "user_test_idrisi", email: "idrisi@silkroad.com", role: "mentor" as const, coinsBalance: 0, streakShields: 0 },
            { id: "user_test_zhenghe", email: "zhenghe@silkroad.com", role: "mentor" as const, coinsBalance: 0, streakShields: 0 },
          ];
          
          for (const u of seedUsers) {
            await realDb.insert(schema.users).values(u).onConflictDoNothing();
          }
          
          const seedMentors = [
            {
              id: "d1245781-cc67-4221-88c9-aaee334455bb",
              userId: "user_test_battuta",
              specialization: "System Design & Global Cloud Architectures",
              hourlyRate: 7500,
              rating: "4.9",
              bio: "Traveled across AWS clusters, configuring high-availability database regions and DynamoDB partitions globally."
            },
            {
              id: "e2245782-dd68-4332-99da-bbee445566cc",
              userId: "user_test_polo",
              specialization: "Next.js 14, React & Core UX Craftsmanship",
              hourlyRate: 6000,
              rating: "5.0",
              bio: "Crafts beautifully interactive fullstack client layouts. Passionate about animations and CSS design tokens."
            },
            {
              id: "f3245783-ee69-4443-a0eb-ccee556677dd",
              userId: "user_test_idrisi",
              specialization: "Geographic Data Visualizations & Interactive Maps (Three.js/D3)",
              hourlyRate: 8000,
              rating: "4.8",
              bio: "Charts path visualization routes. Expert in dynamic SVG bezier curves, interactive HTML Canvas, and WebGL map rendering."
            },
            {
              id: "a4245784-ff70-4554-b1ec-ddee667788ee",
              userId: "user_test_zhenghe",
              specialization: "High-Throughput Databases & Distributed Ledger Transactions",
              hourlyRate: 9000,
              rating: "4.9",
              bio: "Commands fleets of serverless Postgres databases. Expert in database partitioning, multi-region failovers, and ACID transactions."
            }
          ];
          
          for (const m of seedMentors) {
            await realDb.insert(schema.mentors).values(m).onConflictDoNothing();
          }
          console.log("🌱 Default mentors seeded successfully in RDS PostgreSQL.");
        }
      } catch (seedErr: any) {
        console.error("⚠️ Failed to seed default mentors in RDS PostgreSQL:", seedErr.message);
      }
    })
    .catch((err) => {
      console.warn("⚠️ DATABASE_URL is configured but connection check failed. Error:", err.message);
      if (!isRemoteDb) {
        console.warn("Falling back to local in-memory PostgreSQL simulation.");
        useMock = true;
        globalForDb.useMock = true;
      } else {
        console.error("❌ Remote database is unreachable. Dynamic fallback to mock database disabled for remote DB to prevent split-brain.");
      }
    });
}

// Helper to extract primitive values from Drizzle AST queries recursively
function extractValues(obj: any): any[] {
  if (obj === null || obj === undefined) return [];
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    return [obj];
  }
  if (Array.isArray(obj)) {
    return obj.flatMap(extractValues);
  }
  if (typeof obj === "object") {
    let results: any[] = [];
    if ("value" in obj) {
      results = results.concat(extractValues(obj.value));
    }
    for (const key of Object.keys(obj)) {
      if (key !== "table" && key !== "name") {
        results = results.concat(extractValues(obj[key]));
      }
    }
    return results;
  }
  return [];
}

// Mock database operations mapping drizzle interfaces
const mockDb: any = {
  query: {
    users: {
      findFirst: async (queryParams: any) => {
        const inMemoryDb = loadInMemoryDb();
        const vals = extractValues(queryParams?.where);
        const match = inMemoryDb.users.find((u: any) => 
          vals.some(v => u.email === v || u.id === v)
        );
        return match || null;
      }
    },
    roadmaps: {
      findFirst: async (queryParams: any) => {
        const inMemoryDb = loadInMemoryDb();
        const vals = extractValues(queryParams?.where);
        const match = inMemoryDb.roadmaps.find((r: any) => 
          vals.some(v => r.id === v || r.createdBy === v)
        );
        return match || null;
      }
    },
    transactions: {
      findMany: async (queryParams: any) => {
        const inMemoryDb = loadInMemoryDb();
        const vals = extractValues(queryParams?.where);
        if (vals.length === 0) return inMemoryDb.transactions;
        return inMemoryDb.transactions.filter((t: any) => 
          vals.some(v => t.userId === v)
        );
      }
    },
    bookings: {
      findMany: async (queryParams: any) => {
        const inMemoryDb = loadInMemoryDb();
        const vals = extractValues(queryParams?.where);
        if (vals.length === 0) return inMemoryDb.bookings;
        return inMemoryDb.bookings.filter((b: any) => 
          vals.some(v => b.menteeId === v || b.mentorId === v)
        );
      }
    },
    assessments: {
      findMany: async (queryParams: any) => {
        const inMemoryDb = loadInMemoryDb();
        const vals = extractValues(queryParams?.where);
        const store = inMemoryDb.assessments || [];
        if (vals.length === 0) return store;
        return store.filter((a: any) => 
          vals.some(v => a.userId === v || a.trackId === v)
        );
      }
    },
    verificationTokens: {
      findFirst: async (queryParams: any) => {
        const inMemoryDb = loadInMemoryDb();
        const vals = extractValues(queryParams?.where);
        const store = inMemoryDb.verification_tokens || [];
        const match = store.find((vToken: any) =>
          vals.some(v => vToken.email === v || vToken.token === v)
        );
        if (match) {
          return {
            ...match,
            expiresAt: new Date(match.expiresAt),
            createdAt: new Date(match.createdAt)
          };
        }
        return null;
      }
    },
    forumPosts: {
      findMany: async (queryParams: any) => {
        const inMemoryDb = loadInMemoryDb();
        const vals = extractValues(queryParams?.where);
        const store = inMemoryDb.forum_posts || [];
        if (vals.length === 0) return store;
        return store.filter((p: any) =>
          vals.some(v => p.userId === v || p.authorEmail === v)
        );
      }
    }
  },
  insert: (tableObj: any) => {
    const tableName = getTableName(tableObj);
    return {
      values: (data: any) => {
        const normalizedData = Array.isArray(data) ? data : [data];
        const insertedRows: any[] = [];
        const inMemoryDb = loadInMemoryDb();
        
        // Ensure the table collection exists in mock database
        if (!inMemoryDb[tableName]) {
          inMemoryDb[tableName] = [];
        }

        for (const item of normalizedData) {
          // Check if record already exists by ID or Email to simulate upsert
          const store = inMemoryDb[tableName as keyof typeof inMemoryDb] || [];
          let existingIndex = -1;
          if (tableName === "users") {
            existingIndex = store.findIndex((r: any) => r.id === item.id || r.email === item.email);
          } else if (tableName === "verification_tokens") {
            existingIndex = store.findIndex((r: any) => r.email === item.email);
          }

          const row = {
            id: item.id || `id_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            ...item
          };

          if (existingIndex >= 0) {
            Object.assign(store[existingIndex], row);
            insertedRows.push(store[existingIndex]);
          } else {
            store.push(row);
            insertedRows.push(row);
          }
        }
        saveInMemoryDb(inMemoryDb);

        const resultObj: any = {
          returning: async () => insertedRows,
          onConflictDoUpdate: () => resultObj,
          onConflictDoNothing: () => resultObj,
          then: (resolve: any) => resolve(insertedRows)
        };
        return resultObj;
      }
    };
  },
  update: (tableObj: any) => {
    const tableName = getTableName(tableObj);
    return {
      set: (updateData: any) => {
        return {
          where: (whereParam: any) => {
            const vals = extractValues(whereParam);
            const inMemoryDb = loadInMemoryDb();
            const store = inMemoryDb[tableName as keyof typeof inMemoryDb] || [];
            store.forEach((row: any) => {
              const isMatch = vals.some(v => row.id === v || row.email === v || row.userId === v || row.menteeId === v);
              if (isMatch) {
                Object.assign(row, updateData);
              }
            });
            saveInMemoryDb(inMemoryDb);
            return {
              returning: async () => store.filter((row: any) => vals.some(v => row.id === v || row.email === v)),
              then: (resolve: any) => resolve()
            };
          }
        };
      }
    };
  },
  select: () => {
    return {
      from: (tableObj: any) => {
        const tableName = getTableName(tableObj);
        const inMemoryDb = loadInMemoryDb();
        const store = [...(inMemoryDb[tableName as keyof typeof inMemoryDb] || [])];
        // Sort forum posts descending if present
        if (store.length > 0 && store[0].createdAt) {
          store.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        const chain = {
          orderBy: () => chain,
          limit: (n: number) => {
            const sliced = store.slice(0, n);
            return {
              then: (resolve: any) => resolve(sliced)
            };
          },
          then: (resolve: any) => resolve(store)
        };
        return chain;
      }
    };
  },
  delete: (tableObj: any) => {
    const tableName = getTableName(tableObj);
    return {
      where: (whereParam: any) => {
        const vals = extractValues(whereParam);
        const inMemoryDb = loadInMemoryDb();
        const store = inMemoryDb[tableName as keyof typeof inMemoryDb] || [];
        
        // Filter out matching records
        const remaining = store.filter((row: any) => 
          !vals.some(v => row.id === v || row.email === v || row.userId === v)
        );
        
        inMemoryDb[tableName] = remaining;
        saveInMemoryDb(inMemoryDb);
        
        const chain = {
          returning: async () => store.filter((row: any) => vals.some(v => row.id === v || row.email === v || row.userId === v)),
          then: (resolve: any) => resolve()
        };
        return chain;
      }
    };
  }
};

// Helper to playback a call chain on mockDb
function playback(target: any, chain: { prop: string | symbol; args: any[] }[]): any {
  let current = target;
  for (const call of chain) {
    if (!current || typeof current[call.prop] !== "function") {
      // Direct access property lookup
      current = current[call.prop];
    } else {
      current = current[call.prop](...call.args);
    }
  }
  return current;
}

// Recursive builder proxy to record and wrap Drizzle chains
function createBuilderProxy(realObj: any, chain: { prop: string | symbol; args: any[] }[]): any {
  return new Proxy(realObj, {
    get(target, prop, receiver) {
      if (prop === "then") {
        return function (onFulfilled: any, onRejected: any) {
          if (useMock) {
            const fallbackPromise = playback(mockDb, chain);
            if (fallbackPromise && typeof fallbackPromise.then === "function") {
              return fallbackPromise.then(onFulfilled, onRejected);
            }
            return Promise.resolve(fallbackPromise).then(onFulfilled, onRejected);
          }
          try {
            return target.then(onFulfilled, (err: any) => {
              if (isRemoteDb) {
                throw err;
              }
              console.warn("⚠️ Drizzle query execution failed. Falling back to local in-memory simulation.", err.message);
              useMock = true;
              globalForDb.useMock = true;
              const fallbackPromise = playback(mockDb, chain);
              if (fallbackPromise && typeof fallbackPromise.then === "function") {
                return fallbackPromise.then(onFulfilled, onRejected);
              }
              return Promise.resolve(fallbackPromise).then(onFulfilled, onRejected);
            });
          } catch (err: any) {
            if (isRemoteDb) {
              throw err;
            }
            console.warn("⚠️ Drizzle query execution failed. Falling back to local in-memory simulation.", err.message);
            useMock = true;
            globalForDb.useMock = true;
            const fallbackPromise = playback(mockDb, chain);
            if (fallbackPromise && typeof fallbackPromise.then === "function") {
              return fallbackPromise.then(onFulfilled, onRejected);
            }
            return Promise.resolve(fallbackPromise).then(onFulfilled, onRejected);
          }
        };
      }

      const val = Reflect.get(target, prop, receiver);

      if (typeof val === "function") {
        return function (...args: any[]) {
          // ONLY record safe, known builder methods to prevent symbols or engine internals from polluting the chain
          const safeProps = [
            "insert", "values", "onConflictDoUpdate", "onConflictDoNothing", 
            "returning", "update", "set", "where", "delete", "select", 
            "from", "orderBy", "limit", "query", "findFirst", "findMany"
          ];
          const nextChain = safeProps.includes(String(prop))
            ? [...chain, { prop, args }]
            : chain;
          
          try {
            const nextRealObj = val.apply(target, args);
            return createBuilderProxy(nextRealObj, nextChain);
          } catch (err: any) {
            if (isRemoteDb) {
              throw err;
            }
            console.warn("⚠️ Drizzle query building failed. Falling back to local in-memory simulation.", err.message);
            useMock = true;
            globalForDb.useMock = true;
            return playback(mockDb, nextChain);
          }
        };
      }

      return val;
    }
  });
}

// Exported database client wrapper proxy
export const db = new Proxy(realDb, {
  get(target, prop, receiver) {
    if (useMock) {
      return mockDb[prop as keyof typeof mockDb];
    }

    if (prop === "query") {
      return new Proxy(realDb.query, {
        get(qTarget, qTable) {
          const realTable = qTarget[qTable as keyof typeof qTarget];
          return new Proxy(realTable, {
            get(tTarget, tFunc) {
              const realFunc = tTarget[tFunc as keyof typeof tTarget] as any;
              return function (...args: any[]) {
                const chain = [
                  { prop: "query", args: [] },
                  { prop: qTable, args: [] },
                  { prop: tFunc, args }
                ];
                if (useMock) {
                  const fallbackPromise = playback(mockDb, chain);
                  if (fallbackPromise && typeof fallbackPromise.then === "function") {
                    return fallbackPromise;
                  }
                  return Promise.resolve(fallbackPromise);
                }
                try {
                  const result = realFunc.apply(realTable, args);
                  if (result && typeof result.then === "function") {
                    return new Proxy(result, {
                      get(resTarget, resProp) {
                        if (resProp === "then") {
                          return function (onFulfilled: any, onRejected: any) {
                            return resTarget.then(onFulfilled, (err: any) => {
                              if (isRemoteDb) {
                                throw err;
                              }
                              console.warn(`⚠️ Drizzle query.${String(qTable)}.${String(tFunc)} failed. Falling back to local in-memory simulation.`, err.message);
                              useMock = true;
                              globalForDb.useMock = true;
                              const fallbackPromise = playback(mockDb, chain);
                              if (fallbackPromise && typeof fallbackPromise.then === "function") {
                                return fallbackPromise.then(onFulfilled, onRejected);
                              }
                              return Promise.resolve(fallbackPromise).then(onFulfilled, onRejected);
                            });
                          };
                        }
                        return resTarget[resProp];
                      }
                    });
                  }
                  return result;
                } catch (err: any) {
                  if (isRemoteDb) {
                    throw err;
                  }
                  console.warn(`⚠️ Drizzle query.${String(qTable)}.${String(tFunc)} failed. Falling back to local in-memory simulation.`, err.message);
                  useMock = true;
                  globalForDb.useMock = true;
                  const fallbackPromise = playback(mockDb, chain);
                  if (fallbackPromise && typeof fallbackPromise.then === "function") {
                    return fallbackPromise;
                  }
                  return Promise.resolve(fallbackPromise);
                }
              };
            }
          });
        }
      });
    }

    const val = Reflect.get(target, prop, receiver);
    if (typeof val === "function") {
      return function (...args: any[]) {
        const chain = [{ prop, args }];
        try {
          const nextRealObj = val.apply(target, args);
          return createBuilderProxy(nextRealObj, chain);
        } catch (err: any) {
          if (isRemoteDb) {
            throw err;
          }
          console.warn(`⚠️ Drizzle ${String(prop)} failed on build. Falling back to local in-memory simulation.`, err.message);
          useMock = true;
          globalForDb.useMock = true;
          const fallbackPromise = playback(mockDb, chain);
          if (fallbackPromise && typeof fallbackPromise.then === "function") {
            return fallbackPromise;
          }
          return Promise.resolve(fallbackPromise);
        }
      };
    }

    return val;
  }
}) as unknown as typeof realDb;

