export default class extends Error {
  constructor(message: string, public remaining?: any) {
    super(message);
  }
}
