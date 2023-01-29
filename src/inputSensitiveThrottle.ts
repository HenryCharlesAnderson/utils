
type AnyFn = (...args: any[]) => any;

/* Example usage:
* You want to debounce calls to `clickMessage` because it hits the API
* and does some expensive parsing. 
* But if someone clicks messageA and then clicks MessageB soon after, 
* both clicks should go through. The debounce should only act *per messageId*
* 
* Typically it's recommended to create the debounced function in a context
* where the dependent input is already bound. 
* (eg, in the example below: `handleClick = debounce(() => this.dependencies.onMessageClick(this.messageId), 200)`)
*
* But there are situations where having a single function handle all inputs is better.
* In the example below, both the implementation of the function and the fact that it
* is debounced are abstracted away from the site where the dependent input is bound 
* (the Message class's constructor)
* 
* ```
* const clickMessage = (messageId: string): boolean => {
*   try {
*     const response = API.post("/messageClicked", {
*       messageId,
*     });
*     Cache.someExpensiveProcessing(response);
*     return true;
*   } catch (error) {
*     Cache.processError(error);
*     return false;
*   }
* };
* 
* const memoSetup = (fn: AnyFn) =>
*   memoize(fn, (...args) => args.map(String).join(":"));
* const debounceSetup = (fn: AnyFn) =>
*   debounce(fn, 200, { leading: true, trailing: false });*
* const debouncedClickMessage = makeInputSensitiveThrottle(clickMessage, {
*   memoizer: memoSetup,
*   throttler: debounceSetup,
* });
* 
* Class Message {
*		constructor(
*			private id: string,
*			private dependencies: { onMessageClick(messageId: string): void }
*		){}
*		handleClick() { 
*			this.dependencies.onMessageClick(this.id) 
*		}
* }
* ```
*/
export const makeInputSensitiveThrottle = <
  Fn extends AnyFn,
  // TODO: How common is it for throttlers to return `ReturnType<Fn> | undefined`?
  // If it's ubiquitous then we can just add it here so that removing the `| undefined`
  // doesn't have to be done by the consumer every time they use _.throttle
  ThrottlerReturn extends () => ReturnType<Fn>,
  Throttler extends (wrapped: () => ReturnType<Fn>) => ThrottlerReturn,
  MemoizerReturn extends (...args: Parameters<Fn>) => ThrottlerReturn,
  Memoizer extends (
    throttled: (...args: Parameters<Fn>) => ThrottlerReturn
  ) => MemoizerReturn
>(
  func: Fn,
  {
    memoizer,
    throttler,
  }: {
    memoizer: Memoizer;
    throttler: Throttler;
  }
) => {
  const makeThrottleFnForInput = (...args: Parameters<Fn>) => {
    const throttled = throttler(() => func(args));
    return throttled;
  };

  const throttleFnsCachedByInput = memoizer(makeThrottleFnForInput);

  return (...args: Parameters<Fn>) => {
    const throttleFnForInput = throttleFnsCachedByInput(...args);
    return throttleFnForInput();
  };
};
