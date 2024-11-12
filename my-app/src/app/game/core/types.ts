/**
 * -----------------------------------
 * --------     Core Types -----------
 * -----------------------------------
 */

/**
 * --------- Engine ----------
 */



/**
 * ----------- Event Bus ------------
 */









/**
 * -----------------------------------
 * ----------- World -----------------
 * -----------------------------------
 */ 



/**
 * ----------- Chunk ------------
 */


interface ChunkParams {
    maxHeigth: number;
    minHeigth: number;
    groundLevel: number;
}

interface ChunkSize {  
    width: number;
    height: number;
}

/**
 * ----------- Blocks ------------
 */

enum BlockType {
    Empty = 0,
    Default = 1,
}

interface BlockMaterial {
    blockMaterial: any;
}


/**
 * -----------------------------------
 * ----------- Entities --------------
 * -----------------------------------
 */ 

/**
 * ----------- Base ------------------
 */

interface EntityParams {
    id: string;
    position: Position;
    size: number;
    type: string;
}

enum EntityType {
    Player = 0,
    Block = 1,
    Vehicle = 2,
    NPC = 3,
}


/**
 * -----------------------------------
 * ----------- Shared ----------------
 * -----------------------------------
 */

interface Position {
    x: number;
    y: number;
    z: number;
}

