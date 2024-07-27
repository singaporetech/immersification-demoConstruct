export default class simpleDelegate {
    private delegate: (() => void)[] = [];

    public add(method: () => void) {
        this.delegate.push(method);
    }
    
    public remove(method: () => void) {
        const index = this.delegate.indexOf(method);
        if (index !== -1) {
            this.delegate.splice(index, 1);
        }
    }

    public call() {
        for (const method of this.delegate) {
            method();
        }
    }
}