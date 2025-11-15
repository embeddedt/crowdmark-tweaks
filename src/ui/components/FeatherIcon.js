import { useEffect } from "preact/hooks";
import { replaceFeatherIcons } from "../../lib/feather";

export function FeatherIcon({name}) {
    useEffect(() => {
        replaceFeatherIcons();
    }, []);
    return <i data-feather={name}></i>;
}