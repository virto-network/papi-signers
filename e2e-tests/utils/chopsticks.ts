import {
  describe,
  before,
  after,
  type SuiteContext,
  type TestOptions,
} from "node:test";
import { createClient, type PolkadotClient } from "polkadot-api";
import {
  setup,
  type Blockchain,
  ChopsticksProvider,
  type SetupOptions,
} from "@acala-network/chopsticks-core";
import { getSyncProvider } from "@polkadot-api/json-rpc-provider-proxy";

export type ChopsticksContext = SuiteContext & {
  client: PolkadotClient;
  chain: Blockchain;
};

export type ChopsticksTestOptions = TestOptions & {
  chopsticksOptions?: SetupOptions;
};

const getChopsticksProvider = (chain: Blockchain) => {
  return getSyncProvider(async () => {
    const chopProvider = new ChopsticksProvider(chain);

    return (onMessage) => {
      return {
        send: async (message: string) => {
          const parsed = JSON.parse(message);

          if (parsed.method === "chainHead_v1_follow") {
            const subscription = await chopProvider.subscribe(
              "chainHead_v1_followEvent",
              parsed.method,
              parsed.params,
              (err: Error | null, result: unknown) => {
                if (err) {
                  console.error(err);
                  return;
                }
                onMessage(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    method: "chainHead_v1_followEvent",
                    params: {
                      subscription,
                      result,
                    },
                  }),
                );
              },
            );

            onMessage(
              JSON.stringify({
                jsonrpc: "2.0",
                id: parsed.id,
                result: subscription,
              }),
            );
            return;
          } else if (parsed.method === "chainHead_v1_unfollow") {
            const [subId] = parsed.params;
            try {
              await chopProvider.unsubscribe(
                "chainHead_v1_followEvent",
                "chainHead_v1_follow",
                subId,
              );
            } catch (error) {
              console.error("Error unsubscribing", error);
            }
          }

          try {
            const response = await chopProvider.send(
              parsed.method,
              parsed.params,
            );
            onMessage(
              JSON.stringify({
                jsonrpc: "2.0",
                id: parsed.id,
                result: response,
              }),
            );
          } catch (error: unknown) {
            console.error("Chopsticks send error", error);
            const message =
              error instanceof Error ? error.message : "Internal error";
            onMessage(
              JSON.stringify({
                jsonrpc: "2.0",
                id: parsed.id,
                error: {
                  code: -32603,
                  message,
                },
              }),
            );
          }
        },
        disconnect: async () => {
          await chopProvider.disconnect();
        },
      };
    };
  });
};

type ChopsticksFn = (context: ChopsticksContext) => void;

function createWithChopsticks(variant: "default" | "skip" | "todo" | "only") {
  return (
    arg1?: string | ChopsticksTestOptions | ChopsticksFn,
    arg2?: ChopsticksTestOptions | ChopsticksFn,
    arg3?: ChopsticksFn,
  ) => {
    let name: string | undefined;
    let options: ChopsticksTestOptions = {};
    let fn: ChopsticksFn | undefined;

    if (typeof arg1 === "string") {
      name = arg1;
      if (typeof arg2 === "function") {
        fn = arg2;
      } else if (typeof arg2 === "object") {
        options = arg2;
        fn = arg3;
      }
    } else if (typeof arg1 === "function") {
      fn = arg1;
    } else if (typeof arg1 === "object") {
      options = arg1;
      fn = arg2 as ChopsticksFn;
    }

    const { chopsticksOptions, ...testOptions } = options;
    const describeFn = variant === "default" ? describe : describe[variant];

    const wrapper = async (context: SuiteContext) => {
      if (!fn) return;

      before(async () => {
        const endpoint =
          process.env.CHOPSTICKS_ENDPOINT || "wss://rpc.polkadot.io";
        const chain = await setup({
          endpoint,
          ...chopsticksOptions,
        });

        const provider = getChopsticksProvider(chain);

        const client = createClient(provider);

        (context as ChopsticksContext).chain = chain;
        (context as ChopsticksContext).client = client;
      });

      after(async () => {
        if ((context as ChopsticksContext).client)
          (context as ChopsticksContext).client.destroy();
        if ((context as ChopsticksContext).chain)
          await (context as ChopsticksContext).chain.close();
      });

      fn(context as ChopsticksContext);
    };

    if (name) {
      return describeFn(name, testOptions, wrapper);
    } else {
      return describeFn(testOptions, wrapper);
    }
  };
}

export const withChopsticks = Object.assign(createWithChopsticks("default"), {
  skip: createWithChopsticks("skip"),
  todo: createWithChopsticks("todo"),
  only: createWithChopsticks("only"),
});
