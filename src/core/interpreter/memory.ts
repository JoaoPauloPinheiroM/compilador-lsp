/**
 * Memory store utilitário simples. Hoje o interpretador implementa seu próprio
 * Environment, mas deixamos esta classe disponível para usos futuros ou para
 * consumidores externos que prefiram uma API declarativa.
 */
export class Memory {
	private values = new Map<string, any>();

	public define(name: string, value: any): void {
		this.values.set(name.toLowerCase(), value);
	}

	public assign(name: string, value: any): void {
		const key = name.toLowerCase();
		if (!this.values.has(key)) {
			this.define(name, value);
			return;
		}
		this.values.set(key, value);
	}

	public get(name: string): any {
		return this.values.get(name.toLowerCase());
	}

	public snapshot(): Record<string, any> {
		return Object.fromEntries(this.values);
	}
}
