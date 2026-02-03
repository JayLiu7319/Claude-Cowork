import fs from "fs";
import path from "path";
import { app } from "electron";
import log from "electron-log";
import { loadBrandConfig } from "../../config/brand-config.js";
import { getRunnerErrorDetails } from "./error-handler.js";

type PluginConfig = {
    type: "local";
    path: string;
};

type NormalizedPluginConfig = PluginConfig & {
    normalized: boolean;
};

/**
 * Load and normalize plugin configurations for the Claude SDK.
 * Handles plugins with non-standard structures (e.g., marketplace.json instead of plugin.json,
 * scientific-skills instead of skills directory).
 */
export function loadPluginConfigs(bundledPluginsPath: string): PluginConfig[] {
    const brandConfig = loadBrandConfig();
    const pluginNames = brandConfig.plugins ?? ["core-skills"];

    const normalizedPluginConfigs: NormalizedPluginConfig[] = pluginNames.map((name) => {
        const pluginPath = path.join(bundledPluginsPath, name);
        const pluginMetaDir = path.join(pluginPath, ".claude-plugin");
        const pluginJsonPath = path.join(pluginMetaDir, "plugin.json");
        const marketplaceJsonPath = path.join(pluginMetaDir, "marketplace.json");
        const skillsDir = path.join(pluginPath, "skills");
        const scientificSkillsDir = path.join(pluginPath, "scientific-skills");

        const hasPluginJson = fs.existsSync(pluginJsonPath);
        const hasMarketplaceJson = fs.existsSync(marketplaceJsonPath);
        const hasSkillsDir = fs.existsSync(skillsDir);
        const hasScientificSkillsDir = fs.existsSync(scientificSkillsDir);

        log.info("[runner] Plugin probe", {
            name,
            pluginPath,
            pluginPathExists: fs.existsSync(pluginPath),
            hasPluginJson,
            hasMarketplaceJson,
            hasSkillsDir,
            hasScientificSkillsDir
        });

        const needsNormalization =
            (hasMarketplaceJson && !hasPluginJson) || (!hasSkillsDir && hasScientificSkillsDir);

        if (!needsNormalization) {
            return { type: "local" as const, path: pluginPath, normalized: false };
        }

        const normalizedRoot = path.join(app.getPath("userData"), "normalized-plugins", name);
        const normalizedMetaDir = path.join(normalizedRoot, ".claude-plugin");
        fs.mkdirSync(normalizedMetaDir, { recursive: true });

        if (hasMarketplaceJson) {
            fs.copyFileSync(marketplaceJsonPath, path.join(normalizedMetaDir, "marketplace.json"));
            if (!hasPluginJson) {
                let nameFromMarketplace = name;
                let descriptionFromMarketplace = "";
                let versionFromMarketplace = "0.0.0";
                try {
                    const marketplaceRaw = fs.readFileSync(marketplaceJsonPath, "utf-8");
                    const marketplace = JSON.parse(marketplaceRaw);
                    if (typeof marketplace?.name === "string") {
                        nameFromMarketplace = marketplace.name;
                    }
                    if (typeof marketplace?.metadata?.description === "string") {
                        descriptionFromMarketplace = marketplace.metadata.description;
                    }
                    if (typeof marketplace?.metadata?.version === "string") {
                        versionFromMarketplace = marketplace.metadata.version;
                    }
                } catch {
                    // ignore and use fallback metadata
                }

                const shimPluginJson = {
                    name: nameFromMarketplace,
                    description: descriptionFromMarketplace,
                    version: versionFromMarketplace
                };
                fs.writeFileSync(
                    path.join(normalizedMetaDir, "plugin.json"),
                    JSON.stringify(shimPluginJson, null, 2)
                );
            } else {
                fs.copyFileSync(pluginJsonPath, path.join(normalizedMetaDir, "plugin.json"));
            }
        } else if (hasPluginJson) {
            fs.copyFileSync(pluginJsonPath, path.join(normalizedMetaDir, "plugin.json"));
        }

        const sourceSkillsDir = hasSkillsDir ? skillsDir : scientificSkillsDir;
        const normalizedSkillsDir = path.join(normalizedRoot, "skills");
        if (sourceSkillsDir) {
            let existingStats: fs.Stats | null = null;
            try {
                existingStats = fs.lstatSync(normalizedSkillsDir);
            } catch (error) {
                const err = error as NodeJS.ErrnoException;
                if (err.code !== "ENOENT") {
                    log.warn("[runner] Failed to inspect existing skills path", {
                        name,
                        normalizedSkillsDir,
                        error: String(error)
                    });
                }
            }

            if (existingStats) {
                if (existingStats.isSymbolicLink()) {
                    const currentTarget = fs.readlinkSync(normalizedSkillsDir);
                    if (path.resolve(currentTarget) === path.resolve(sourceSkillsDir)) {
                        log.info("[runner] Plugin skills link already exists", {
                            name,
                            normalizedSkillsDir,
                            currentTarget,
                            targetExists: fs.existsSync(currentTarget)
                        });
                    } else {
                        log.warn("[runner] Plugin skills link points to different target", {
                            name,
                            normalizedSkillsDir,
                            currentTarget,
                            expectedTarget: sourceSkillsDir,
                            currentTargetExists: fs.existsSync(currentTarget),
                            expectedTargetExists: fs.existsSync(sourceSkillsDir)
                        });
                    }
                } else {
                    log.warn("[runner] Plugin skills path exists and is not a link", {
                        name,
                        normalizedSkillsDir
                    });
                }
            } else {
                try {
                    fs.symlinkSync(sourceSkillsDir, normalizedSkillsDir, "junction");
                    log.info("[runner] Plugin skills link created", {
                        name,
                        normalizedSkillsDir,
                        sourceSkillsDir
                    });
                } catch (error) {
                    log.error("[runner] Failed to create plugin skills link", {
                        name,
                        normalizedSkillsDir,
                        sourceSkillsDir,
                        error: String(error),
                        details: getRunnerErrorDetails(error)
                    });
                    throw error;
                }
            }
        }

        return { type: "local" as const, path: normalizedRoot, normalized: true };
    });

    return normalizedPluginConfigs.map(({ type, path: pluginPath }) => ({
        type,
        path: pluginPath
    }));
}
