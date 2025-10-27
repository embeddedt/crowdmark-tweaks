
export class CommentTrie<V> {
    element?: V;
    children?: Map<string, CommentTrie<V>>;
    usages: number;

    constructor() {
        this.clear();
    }

    insertChild(prefix: string, value: V) {
        const t = this.getNestedTrieForPrefix(prefix)
        if (t != null) {
            t.element = value
            return
        }
        this._insertChild(prefix, 0, value);
    }

    private _insertChild(prefix: string, charIdx: number, value: V) {
        this.usages++

        if (charIdx == prefix.length) {
            if (this.element != null) {
                throw new Error("Multiple attempts to insert to the same node");
            }
            this.element = value;
            return;
        }

        if (!this.children) {
            this.children = new Map();
        }
        const nextChar = prefix.charAt(charIdx);
        let nestedTrie: CommentTrie<V>;
        if (this.children.has(nextChar)) {
            nestedTrie = this.children.get(nextChar);
        } else {
            nestedTrie = new CommentTrie();
            this.children.set(nextChar, nestedTrie);
        }
        nestedTrie._insertChild(prefix, charIdx + 1, value);
    }

    visit(consumer: (prefix: string, e: V) => void) {
        if (this.element) {
            consumer("", this.element);
        } else if (this.children != null) {
            for (const [k, v] of this.children.entries()) {
                v.visit((p, e) => {
                    consumer(k + p, e);
                });
            }
        }
    }

    forEachValue(consumer: (e: V) => void) {
        if (this.element) {
            consumer(this.element);
        } else if (this.children != null) {
            for (const v of this.children.values()) {
                v.forEachValue(consumer);
            }
        }
    }

    getNestedTrieForPrefix(prefix: string): CommentTrie<V> {
        return this._getNestedTrieForChar(prefix, 0)
    }

    _getNestedTrieForChar(prefix: string, charIdx: number): CommentTrie<V> {
        if (charIdx == prefix.length) {
            return this
        }

        if (this.children != null) {
            const char = prefix.charAt(charIdx)
            const nestedTrie = this.children.get(char)
            if (nestedTrie) {
                return nestedTrie._getNestedTrieForChar(prefix, charIdx + 1)
            }
        }

        return null
    }

    get(key: string): V {
        const trie = this.getNestedTrieForPrefix(key);
        return trie?.element ?? null
    }

    clear() {
        this.usages = 0;
        this.element = null;
        this.children = null;
    }

    private _getUniqueContainedElement() {
        if (this.element != null) {
            return this.element
        }

        if (this.children && this.children.size == 1) {
            return [...this.children.values()][0]._getUniqueContainedElement();
        }

        throw new Error("Contained element not found")
    }

    createKeybindHandler(finalCallback: (v: V) => void): (key: string) => boolean {
        return (searchKey) => {
            const searchResult = this.getNestedTrieForPrefix(searchKey);
            if (searchResult == null || searchResult.usages == 0) {
                console.warn("no matching value found");
                return false;
            } else if (searchResult.usages > 1) {
                return true;
            }

            finalCallback(searchResult._getUniqueContainedElement());

            return false;
        };
    }

    size(): number {
        return this.usages
    }

    toString(): string {
        const elements = [];
        this.visit((prefix, e) => {
            elements.push(prefix + " -> " + e);
        });
        return "Trie{" + elements.join(", ") + "}"
    }
}