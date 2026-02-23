import { useEffect, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/themes/prism-tomorrow.css';
import { treeToYAML } from '../utils/yamlParser';
import type { ScriptNode } from '../types/script';
import { YAMLNode } from '../types/yaml';

interface YAMLPreviewProps {
    tree: ScriptNode;
}

export function YAMLPreview({ tree }: YAMLPreviewProps) {
    const [yaml, setYaml] = useState('');

    useEffect(() => {
        try {
            // Cast ScriptNode to YAMLNode as they are structurally compatible
            const generatedYaml = treeToYAML(tree as unknown as YAMLNode);
            setYaml(generatedYaml);
        } catch (err) {
            console.error('Error generating YAML preview:', err);
        }
    }, [tree]);

    useEffect(() => {
        Prism.highlightAll();
    }, [yaml]);

    return (
        <div className="h-full flex flex-col bg-transparent overflow-hidden">
            <div className="flex-1 overflow-auto p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <pre className="m-0 bg-transparent !p-0">
                    <code className="language-yaml text-[13px] leading-relaxed">
                        {yaml}
                    </code>
                </pre>
            </div>
        </div>
    );
}
