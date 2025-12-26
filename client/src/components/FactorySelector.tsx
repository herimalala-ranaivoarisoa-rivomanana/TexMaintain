import React from 'react';
import { useFactory } from '../contexts/FactoryContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";

export const FactorySelector: React.FC = () => {
    const { factories, currentFactory, setCurrentFactory } = useFactory();

    if (!factories || factories.length <= 1) {
        return null;
    }

    return (
        <div className="flex items-center space-x-2">
            <span className="text-sm font-medium hidden md:inline-block text-muted-foreground">Usine:</span>
            <Select
                value={currentFactory?._id}
                onValueChange={(value) => {
                    const selected = factories.find(f => f._id === value);
                    if (selected) setCurrentFactory(selected);
                }}
            >
                <SelectTrigger className="w-[180px] h-8 bg-background border-input">
                    <SelectValue placeholder="Choisir une usine" />
                </SelectTrigger>
                <SelectContent>
                    {factories.map((factory) => (
                        <SelectItem key={factory._id} value={factory._id}>
                            {factory.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};
