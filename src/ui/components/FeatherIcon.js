import { useEffect } from "preact/hooks";
export function FeatherIcon({name}) {
    useEffect(() => {
        unsafeWindow.feather.replace();
    }, []);
    return <i data-feather={name}></i>;
}