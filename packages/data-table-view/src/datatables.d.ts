type DataTablesFactory = (root: Window, jquery: unknown) => unknown;
type DataTableSettings = NonNullable<Parameters<JQuery['DataTable']>[0]> & {
    buttons: Array<Record<string, unknown>>;
};

declare module 'datatables.net-responsive' {
    const factory: DataTablesFactory;
    export default factory;
}

declare module 'datatables.net-responsive-dt' {
    const factory: DataTablesFactory;
    export default factory;
}

declare module 'datatables.net-buttons' {
    const factory: DataTablesFactory;
    export default factory;
}

declare module 'datatables.net-buttons-dt' {
    const factory: DataTablesFactory;
    export default factory;
}
