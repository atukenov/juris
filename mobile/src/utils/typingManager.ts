export class TypingManager {
  private timeoutRef: ReturnType<typeof setTimeout> | undefined;
  private isTyping: boolean = false;
  
  constructor(
    private onTypingStart: () => void,
    private onTypingStop: () => void,
    private timeout: number = 2000
  ) {}

  handleTextChange(text: string) {
    if (text.length > 0 && !this.isTyping) {
      this.isTyping = true;
      this.onTypingStart();
    }
    
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }
    
    this.timeoutRef = setTimeout(() => {
      this.isTyping = false;
      this.onTypingStop();
    }, this.timeout) as ReturnType<typeof setTimeout>;
  }

  stop() {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }
    if (this.isTyping) {
      this.isTyping = false;
      this.onTypingStop();
    }
  }

  cleanup() {
    this.stop();
  }
}
